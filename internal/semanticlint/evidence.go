package semanticlint

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
)

type repositorySnapshot struct {
	changedPaths    []string
	repositoryPaths []string
	diff            string
}

func gitSnapshot(ctx context.Context, root string) (repositorySnapshot, error) {
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
	deleted, err := gitOutput(ctx, root, "ls-files", "--deleted", "-z")
	if err != nil {
		return repositorySnapshot{}, fmt.Errorf("could not read deleted repository files: %w", err)
	}
	diff, err := gitOutput(ctx, root, "diff", "--no-ext-diff", "--unified=3", "HEAD", "--")
	if err != nil {
		return repositorySnapshot{}, fmt.Errorf("could not read working-tree diff: %w", err)
	}
	changedPaths := uniquePaths(append(nullSeparatedPaths(tracked), nullSeparatedPaths(untracked)...))
	deletedSet := make(map[string]bool)
	for _, path := range nullSeparatedPaths(deleted) {
		deletedSet[path] = true
	}
	repositoryPaths := uniquePaths(nullSeparatedPaths(repository))
	repositoryPaths = deleteMatching(repositoryPaths, deletedSet)
	return repositorySnapshot{changedPaths: changedPaths, repositoryPaths: repositoryPaths, diff: string(diff)}, nil
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

func deleteMatching(paths []string, deleted map[string]bool) []string {
	result := paths[:0]
	for _, path := range paths {
		if !deleted[path] {
			result = append(result, path)
		}
	}
	return result
}

func buildRepositoryEvidence(root string, snapshot repositorySnapshot, reviewContextPath string) (RepositoryEvidence, error) {
	paths := make([]string, 0, len(snapshot.repositoryPaths))
	for _, path := range snapshot.repositoryPaths {
		if repositoryExtensions[filepath.Ext(path)] {
			paths = append(paths, path)
		}
	}
	files, err := readSources(root, paths)
	if err != nil {
		return RepositoryEvidence{}, err
	}
	repositorySet := make(map[string]bool, len(snapshot.repositoryPaths))
	for _, path := range snapshot.repositoryPaths {
		repositorySet[path] = true
	}
	var deleted []string
	for _, path := range snapshot.changedPaths {
		if !repositorySet[path] {
			deleted = append(deleted, path)
		}
	}
	evidence := RepositoryEvidence{
		Paths: snapshot.repositoryPaths, ChangedPaths: snapshot.changedPaths,
		DeletedPaths: deleted, Files: files,
	}
	evidence.DiffFiles = diffFilesFromEvidence(snapshot.diff, snapshot.changedPaths, deleted, files)
	if reviewContextPath != "" {
		path := reviewContextPath
		if !filepath.IsAbs(path) {
			path = filepath.Join(root, path)
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return RepositoryEvidence{}, fmt.Errorf("read review context: %w", err)
		}
		evidence.ReviewContext = &Source{Path: filepath.ToSlash(reviewContextPath), Language: "text", Text: string(content)}
	}
	return evidence, nil
}

func readSources(root string, paths []string) ([]Source, error) {
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
				content, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(paths[index])))
				if err != nil {
					mu.Lock()
					if firstErr == nil {
						firstErr = fmt.Errorf("read %s: %w", paths[index], err)
					}
					mu.Unlock()
					continue
				}
				extension := strings.TrimPrefix(filepath.Ext(paths[index]), ".")
				if extension == "" {
					extension = "unknown"
				}
				result[index] = Source{Path: paths[index], Language: extension, Text: string(content)}
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

func sourceCandidates(source Source) []SourceCandidate {
	lines := strings.Split(source.Text, "\n")
	step := sourceChunkLineCount - sourceChunkOverlapLineCount
	count := (max(0, len(lines)-sourceChunkLineCount)+step-1)/step + 1
	result := make([]SourceCandidate, 0, count)
	for index := range count {
		start := index * step
		end := min(len(lines), start+sourceChunkLineCount)
		result = append(result, SourceCandidate{Path: source.Path, Language: source.Language, StartLine: start + 1, EndLine: end, Text: strings.Join(lines[start:end], "\n")})
	}
	return result
}

func diffFilesFromEvidence(diff string, changedPaths, deletedPaths []string, files []Source) []DiffFile {
	parsed := parseDiffFiles(diff)
	parsedPaths := make(map[string]bool)
	for _, file := range parsed {
		parsedPaths[file.Path] = true
	}
	sourceByPath := make(map[string]Source)
	for _, source := range files {
		sourceByPath[source.Path] = source
	}
	deleted := make(map[string]bool)
	for _, path := range deletedPaths {
		deleted[path] = true
	}
	for changedIndex, path := range changedPaths {
		if parsedPaths[path] {
			continue
		}
		id := fmt.Sprintf("file_%d", len(parsed)+changedIndex+1)
		source, ok := sourceByPath[path]
		if !ok {
			parsed = append(parsed, DiffFile{ID: id, Path: path, Status: "deleted", Hunks: []DiffHunk{}})
			continue
		}
		status := "untracked"
		if deleted[path] {
			status = "deleted"
		}
		var hunks []DiffHunk
		for index, candidate := range sourceCandidates(source) {
			hunks = append(hunks, DiffHunk{ID: fmt.Sprintf("%s_hunk_%d", id, index+1), Path: path, NewStartLine: candidate.StartLine, NewLineCount: candidate.EndLine - candidate.StartLine + 1, Header: "Untracked file", Patch: candidate.Text})
		}
		parsed = append(parsed, DiffFile{ID: id, Path: path, Status: status, Hunks: hunks})
	}
	return parsed
}

func parseDiffFiles(diff string) []DiffFile {
	var result []DiffFile
	sections := strings.Split(diff, "diff --git ")
	for _, section := range sections[1:] {
		lines := strings.Split(section, "\n")
		oldPath, newPath := "", ""
		for _, line := range lines {
			if strings.HasPrefix(line, "--- ") {
				oldPath = parseDiffPath(strings.TrimPrefix(line, "--- "))
			}
			if strings.HasPrefix(line, "+++ ") {
				newPath = parseDiffPath(strings.TrimPrefix(line, "+++ "))
			}
		}
		path := newPath
		if path == "" {
			path = oldPath
		}
		if path == "" {
			continue
		}
		id := fmt.Sprintf("file_%d", len(result)+1)
		status := "modified"
		switch {
		case oldPath == "":
			status = "added"
		case newPath == "":
			status = "deleted"
		case oldPath != newPath:
			status = "renamed"
		}
		file := DiffFile{ID: id, Path: path, Status: status}
		if oldPath != "" && oldPath != path {
			file.PreviousPath = oldPath
		}
		file.Hunks = parseHunks(id, path, lines)
		result = append(result, file)
	}
	return result
}

func parseDiffPath(value string) string {
	value = strings.SplitN(value, "\t", 2)[0]
	if value == "/dev/null" {
		return ""
	}
	if unquoted, err := strconv.Unquote(value); err == nil {
		value = unquoted
	}
	value = strings.TrimPrefix(strings.TrimPrefix(value, "a/"), "b/")
	return filepath.ToSlash(value)
}

func parseHunks(fileID, path string, lines []string) []DiffHunk {
	var result []DiffHunk
	for index := 0; index < len(lines); {
		if !strings.HasPrefix(lines[index], "@@ ") {
			index++
			continue
		}
		end := index + 1
		for end < len(lines) && !strings.HasPrefix(lines[end], "@@ ") {
			end++
		}
		if hunk, ok := parseHunkHeader(fileID, path, len(result)+1, lines[index:end]); ok {
			result = append(result, hunk)
		}
		index = end
	}
	return result
}

func parseHunkHeader(fileID, path string, ordinal int, lines []string) (DiffHunk, bool) {
	if len(lines) == 0 {
		return DiffHunk{}, false
	}
	parts := strings.SplitN(strings.TrimPrefix(lines[0], "@@ -"), " @@", 2)
	if len(parts) != 2 {
		return DiffHunk{}, false
	}
	ranges := strings.Split(parts[0], " +")
	if len(ranges) != 2 {
		return DiffHunk{}, false
	}
	oldStart, oldCount, ok := parseLineRange(ranges[0])
	if !ok {
		return DiffHunk{}, false
	}
	newStart, newCount, ok := parseLineRange(ranges[1])
	if !ok {
		return DiffHunk{}, false
	}
	return DiffHunk{ID: fmt.Sprintf("%s_hunk_%d", fileID, ordinal), Path: path, OldStartLine: oldStart, OldLineCount: oldCount, NewStartLine: newStart, NewLineCount: newCount, Header: strings.TrimSpace(parts[1]), Patch: strings.Join(lines, "\n")}, true
}

func parseLineRange(value string) (int, int, bool) {
	parts := strings.SplitN(value, ",", 2)
	start, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, false
	}
	count := 1
	if len(parts) == 2 {
		count, err = strconv.Atoi(parts[1])
		if err != nil {
			return 0, 0, false
		}
	}
	return start, count, true
}
