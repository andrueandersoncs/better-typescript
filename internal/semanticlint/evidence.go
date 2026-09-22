package semanticlint

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	appconfig "github.com/andrueandersoncs/better-typescript/internal/config"
	"github.com/andrueandersoncs/better-typescript/internal/fileglob"
)

type repositorySnapshot struct {
	changedPaths    []string
	repositoryPaths []string
	revision        string
}

func loadConfiguration(ctx context.Context, root string, snapshot repositorySnapshot) (appconfig.File, error) {
	if snapshot.revision == "" {
		return appconfig.Load(root)
	}
	index := sort.SearchStrings(snapshot.repositoryPaths, appconfig.FileName)
	if index == len(snapshot.repositoryPaths) || snapshot.repositoryPaths[index] != appconfig.FileName {
		return appconfig.File{}, nil
	}
	content, err := readSource(ctx, root, snapshot.revision, appconfig.FileName)
	if err != nil {
		return appconfig.File{}, fmt.Errorf("read %s: %w", appconfig.FileName, err)
	}
	return appconfig.Parse(content)
}

func gitSnapshot(ctx context.Context, root, commitRange string) (repositorySnapshot, error) {
	if strings.TrimSpace(commitRange) != "" {
		return gitRangeSnapshot(ctx, root, commitRange)
	}
	tracked, err := gitOutput(ctx, root, "diff", "--name-only", "-z", "HEAD", "--")
	if err != nil {
		return repositorySnapshot{}, fmt.Errorf("could not read tracked changes: %w", err)
	}
	untracked, err := gitOutput(ctx, root, "ls-files", "--others", "--exclude-standard", "-z")
	if err != nil {
		return repositorySnapshot{}, fmt.Errorf("could not read untracked files: %w", err)
	}
	repository, err := gitOutput(ctx, root, "ls-files", "--cached", "--others", "--exclude-standard", "-z")
	if err != nil {
		return repositorySnapshot{}, fmt.Errorf("could not read repository files: %w", err)
	}
	return repositorySnapshot{
		changedPaths:    uniquePaths(append(nullSeparatedPaths(tracked), nullSeparatedPaths(untracked)...)),
		repositoryPaths: uniquePaths(nullSeparatedPaths(repository)),
	}, nil
}

func selectCurrentFiles(root string, snapshot repositorySnapshot, filePatterns []string, all bool) (repositorySnapshot, error) {
	var patterns []fileglob.Pattern
	for _, value := range filePatterns {
		if filepath.IsAbs(filepath.FromSlash(value)) {
			return repositorySnapshot{}, fmt.Errorf("file glob must be repository-relative: %s", value)
		}
		value = filepath.ToSlash(filepath.Clean(filepath.FromSlash(value)))
		if value == ".." || strings.HasPrefix(value, "../") {
			return repositorySnapshot{}, fmt.Errorf("file glob must stay within the repository: %s", value)
		}
		if info, err := os.Stat(filepath.Join(root, filepath.FromSlash(value))); err == nil && info.IsDir() {
			value = strings.TrimSuffix(value, "/") + "/**"
		} else if err != nil && !os.IsNotExist(err) {
			return repositorySnapshot{}, fmt.Errorf("read selected path %s: %w", value, err)
		}
		compiled, err := fileglob.CompileAll(value)
		if err != nil {
			return repositorySnapshot{}, err
		}
		patterns = append(patterns, compiled...)
	}
	var selected []string
	for _, path := range snapshot.repositoryPaths {
		if !repositoryExtensions[filepath.Ext(path)] {
			continue
		}
		if all || matchesAnyPath(patterns, path) {
			selected = append(selected, path)
		}
	}
	if !all && len(selected) == 0 {
		return repositorySnapshot{}, fmt.Errorf("--files matched no eligible repository files")
	}
	snapshot.changedPaths = selected
	return snapshot, nil
}

func matchesAnyPath(patterns []fileglob.Pattern, path string) bool {
	for _, pattern := range patterns {
		if pattern.Match(path) {
			return true
		}
	}
	return false
}

func gitRangeSnapshot(ctx context.Context, root, value string) (repositorySnapshot, error) {
	left, separator, right, err := splitCommitRange(value)
	if err != nil {
		return repositorySnapshot{}, err
	}
	leftCommit, err := resolveCommit(ctx, root, left)
	if err != nil {
		return repositorySnapshot{}, fmt.Errorf("resolve range start %q: %w", left, err)
	}
	rightCommit, err := resolveCommit(ctx, root, right)
	if err != nil {
		return repositorySnapshot{}, fmt.Errorf("resolve range end %q: %w", right, err)
	}
	normalizedRange := leftCommit + separator + rightCommit
	changed, err := gitOutput(ctx, root, "diff", "--name-only", "-z", normalizedRange, "--")
	if err != nil {
		return repositorySnapshot{}, fmt.Errorf("could not read range changes: %w", err)
	}
	repository, err := gitOutput(ctx, root, "ls-tree", "-r", "--name-only", "-z", rightCommit)
	if err != nil {
		return repositorySnapshot{}, fmt.Errorf("could not read range repository files: %w", err)
	}
	return repositorySnapshot{
		changedPaths:    uniquePaths(nullSeparatedPaths(changed)),
		repositoryPaths: uniquePaths(nullSeparatedPaths(repository)),
		revision:        rightCommit,
	}, nil
}

func splitCommitRange(value string) (string, string, string, error) {
	value = strings.TrimSpace(value)
	separator := ".."
	if strings.Contains(value, "...") {
		separator = "..."
	}
	parts := strings.SplitN(value, separator, 2)
	if len(parts) != 2 || strings.TrimSpace(parts[0]) == "" || strings.TrimSpace(parts[1]) == "" || strings.Contains(parts[0], "..") || strings.Contains(parts[1], "..") {
		return "", "", "", fmt.Errorf("commit range must have the form <from>..<to> or <from>...<to>")
	}
	return strings.TrimSpace(parts[0]), separator, strings.TrimSpace(parts[1]), nil
}

func resolveCommit(ctx context.Context, root, revision string) (string, error) {
	output, err := gitOutput(ctx, root, "rev-parse", "--verify", "--end-of-options", revision+"^{commit}")
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func gitOutput(ctx context.Context, root string, args ...string) ([]byte, error) {
	command := exec.CommandContext(ctx, "git", args...)
	command.Dir = root
	var stdout, stderr bytes.Buffer
	command.Stdout = &stdout
	command.Stderr = &stderr
	if err := command.Run(); err != nil {
		detail := strings.TrimSpace(stderr.String())
		if detail == "" {
			detail = err.Error()
		}
		return nil, fmt.Errorf("%s", detail)
	}
	return stdout.Bytes(), nil
}

func nullSeparatedPaths(value []byte) []string {
	parts := bytes.Split(value, []byte{0})
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if len(part) > 0 {
			result = append(result, filepath.ToSlash(string(part)))
		}
	}
	return result
}

func uniquePaths(paths []string) []string {
	sort.Strings(paths)
	result := paths[:0]
	for _, path := range paths {
		if len(result) == 0 || result[len(result)-1] != path {
			result = append(result, path)
		}
	}
	return result
}

func loadSelectedSources(ctx context.Context, root string, snapshot repositorySnapshot) ([]Source, error) {
	present := make(map[string]bool, len(snapshot.repositoryPaths))
	for _, path := range snapshot.repositoryPaths {
		present[path] = true
	}
	paths := make([]string, 0, len(snapshot.changedPaths))
	for _, path := range snapshot.changedPaths {
		if present[path] && repositoryExtensions[filepath.Ext(path)] {
			paths = append(paths, path)
		}
	}
	return readSources(ctx, root, snapshot.revision, paths)
}

func readSources(ctx context.Context, root, revision string, paths []string) ([]Source, error) {
	result := make([]Source, len(paths))
	jobs := make(chan int)
	var firstErr error
	var mu sync.Mutex
	var workers sync.WaitGroup
	workerCount := min(16, max(1, len(paths)))
	for range workerCount {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for index := range jobs {
				content, err := readSource(ctx, root, revision, paths[index])
				if err != nil {
					mu.Lock()
					if firstErr == nil {
						firstErr = fmt.Errorf("read %s: %w", paths[index], err)
					}
					mu.Unlock()
					continue
				}
				result[index] = Source{Path: paths[index], Text: string(content)}
			}
		}()
	}
	for index := range paths {
		jobs <- index
	}
	close(jobs)
	workers.Wait()
	if firstErr != nil {
		return nil, firstErr
	}
	return result, nil
}

func readSource(ctx context.Context, root, revision, path string) ([]byte, error) {
	if revision == "" {
		return os.ReadFile(filepath.Join(root, filepath.FromSlash(path)))
	}
	return gitOutput(ctx, root, "show", revision+":"+path)
}
