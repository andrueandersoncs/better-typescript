package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const (
	compilerModule = "github.com/andrueandersoncs/typescript-go"
	upstreamURL    = "https://github.com/microsoft/typescript-go"
	documentPath   = "docs/compiler-foundation.md"
	noticesPath    = "THIRD-PARTY-NOTICES.md"
	retainedNotice = "LICENSES/typescript-go-NOTICE.txt"
)

type provenance struct {
	Module    string
	Version   string
	Commit    string
	Base      string
	ModuleDir string
}

type moduleEdit struct {
	Require []struct {
		Path    string
		Version string
	}
}

type moduleDownload struct {
	Path    string
	Version string
	Dir     string
	Origin  *struct {
		VCS  string
		URL  string
		Hash string
		Ref  string
	}
}

func main() {
	if len(os.Args) != 2 || (os.Args[1] != "check" && os.Args[1] != "update") {
		fmt.Fprintf(os.Stderr, "usage: go run ./scripts/compiler-provenance.go <check|update>\n")
		os.Exit(2)
	}

	resolved, err := resolveCompiler()
	if err != nil {
		fatal(err)
	}

	base, err := deriveBase(resolved)
	if err != nil {
		fatal(err)
	}
	resolved.Base = base

	if os.Args[1] == "update" {
		if err := updateRetainedProvenance(resolved); err != nil {
			fatal(err)
		}
	}

	if err := checkRetainedProvenance(resolved); err != nil {
		fatal(err)
	}
}

func fatal(err error) {
	fmt.Fprintf(os.Stderr, "compiler provenance: %v\n", err)
	os.Exit(1)
}

func resolveCompiler() (provenance, error) {
	output, err := commandOutput("go", "mod", "edit", "-json")
	if err != nil {
		return provenance{}, err
	}
	var edit moduleEdit
	if err := json.Unmarshal(output, &edit); err != nil {
		return provenance{}, fmt.Errorf("parse go.mod: %w", err)
	}

	version := ""
	for _, requirement := range edit.Require {
		if requirement.Path == compilerModule {
			if version != "" {
				return provenance{}, errors.New("go.mod contains duplicate compiler requirements")
			}
			version = requirement.Version
		}
	}
	if version == "" {
		return provenance{}, fmt.Errorf("go.mod does not require %s", compilerModule)
	}

	output, err = commandOutput("go", "mod", "download", "-json", compilerModule+"@"+version)
	if err != nil {
		return provenance{}, err
	}
	var download moduleDownload
	if err := json.Unmarshal(output, &download); err != nil {
		return provenance{}, fmt.Errorf("parse go mod download output: %w", err)
	}
	if download.Path != compilerModule || download.Version != version {
		return provenance{}, fmt.Errorf("resolved module is %s@%s, want %s@%s", download.Path, download.Version, compilerModule, version)
	}
	if download.Origin == nil || download.Origin.VCS != "git" || download.Origin.Hash == "" {
		return provenance{}, errors.New("go mod download did not return Git origin provenance")
	}
	if download.Origin.Ref != "refs/tags/"+version {
		return provenance{}, fmt.Errorf("resolved version is not tag %s: origin ref is %q", version, download.Origin.Ref)
	}
	if download.Dir == "" {
		return provenance{}, errors.New("go mod download did not return a module directory")
	}

	return provenance{
		Module:    compilerModule,
		Version:   version,
		Commit:    download.Origin.Hash,
		ModuleDir: download.Dir,
	}, nil
}

func deriveBase(resolved provenance) (string, error) {
	temporary, err := os.MkdirTemp("", "better-typescript-compiler-provenance.*")
	if err != nil {
		return "", fmt.Errorf("create temporary Git directory: %w", err)
	}
	defer os.RemoveAll(temporary)

	if _, err := commandOutputIn(temporary, "git", "init", "--quiet"); err != nil {
		return "", err
	}
	if _, err := commandOutputIn(temporary, "git", "fetch", "--quiet", "--depth=2", "https://github.com/andrueandersoncs/typescript-go", "refs/tags/"+resolved.Version); err != nil {
		return "", fmt.Errorf("fetch compiler tag %s: %w", resolved.Version, err)
	}
	commitBytes, err := commandOutputIn(temporary, "git", "rev-parse", "FETCH_HEAD^{commit}")
	if err != nil {
		return "", err
	}
	commit := strings.TrimSpace(string(commitBytes))
	if commit != resolved.Commit {
		return "", fmt.Errorf("fetched tag commit is %s, go mod download resolved %s", commit, resolved.Commit)
	}

	parentsBytes, err := commandOutputIn(temporary, "git", "rev-list", "--parents", "-n", "1", commit)
	if err != nil {
		return "", err
	}
	parents := strings.Fields(string(parentsBytes))
	if len(parents) != 2 {
		return "", fmt.Errorf("tag commit %s must be exactly one commit above its base; found %d parents", commit, len(parents)-1)
	}
	base := parents[1]

	upstreamBytes, err := commandOutputIn(temporary, "git", "fetch", "--quiet", "--depth=1", upstreamURL, base)
	if err != nil {
		return "", fmt.Errorf("verify base %s against Microsoft upstream: %w", base, err)
	}
	_ = upstreamBytes
	fetchedBytes, err := commandOutputIn(temporary, "git", "rev-parse", "FETCH_HEAD^{commit}")
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(string(fetchedBytes)) != base {
		return "", fmt.Errorf("Microsoft upstream did not resolve base commit %s", base)
	}
	return base, nil
}

func checkRetainedProvenance(resolved provenance) error {
	documented, err := readProvenance(documentPath)
	if err != nil {
		return err
	}
	noticed, err := readProvenance(noticesPath)
	if err != nil {
		return err
	}
	for path, actual := range map[string]provenance{documentPath: documented, noticesPath: noticed} {
		if actual.Module != resolved.Module || actual.Version != resolved.Version || actual.Commit != resolved.Commit || actual.Base != resolved.Base {
			return fmt.Errorf("%s records %s@%s tag %s base %s; resolved dependency is %s@%s tag %s base %s", path, actual.Module, actual.Version, actual.Commit, actual.Base, resolved.Module, resolved.Version, resolved.Commit, resolved.Base)
		}
	}

	moduleNotice, err := os.ReadFile(filepath.Join(resolved.ModuleDir, "NOTICE.txt"))
	if err != nil {
		return fmt.Errorf("read resolved module NOTICE.txt: %w", err)
	}
	keptNotice, err := os.ReadFile(retainedNotice)
	if err != nil {
		return fmt.Errorf("read retained compiler NOTICE: %w", err)
	}
	if !bytes.Equal(moduleNotice, keptNotice) {
		return fmt.Errorf("%s differs from the resolved module NOTICE.txt", retainedNotice)
	}
	return nil
}

func updateRetainedProvenance(resolved provenance) error {
	for _, path := range []string{documentPath, noticesPath} {
		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read %s: %w", path, err)
		}
		updated, err := replaceProvenance(string(content), resolved)
		if err != nil {
			return fmt.Errorf("update %s: %w", path, err)
		}
		if err := os.WriteFile(path, []byte(updated), 0o644); err != nil {
			return fmt.Errorf("write %s: %w", path, err)
		}
	}

	notice, err := os.ReadFile(filepath.Join(resolved.ModuleDir, "NOTICE.txt"))
	if err != nil {
		return fmt.Errorf("read resolved module NOTICE.txt: %w", err)
	}
	if err := os.WriteFile(retainedNotice, notice, 0o644); err != nil {
		return fmt.Errorf("write %s: %w", retainedNotice, err)
	}
	return nil
}

func readProvenance(path string) (provenance, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return provenance{}, fmt.Errorf("read %s: %w", path, err)
	}
	fields, err := provenanceFields(string(content))
	if err != nil {
		return provenance{}, fmt.Errorf("parse %s: %w", path, err)
	}
	return fields, nil
}

func provenanceFields(content string) (provenance, error) {
	values := make(map[string]string)
	for _, line := range strings.Split(content, "\n") {
		for _, label := range []string{"Module", "Version", "Tag commit", "Microsoft base commit"} {
			prefix := "- " + label + ": `"
			if !strings.HasPrefix(line, prefix) || !strings.HasSuffix(line, "`") {
				continue
			}
			if _, exists := values[label]; exists {
				return provenance{}, fmt.Errorf("duplicate %s field", label)
			}
			values[label] = strings.TrimSuffix(strings.TrimPrefix(line, prefix), "`")
		}
	}
	for _, label := range []string{"Module", "Version", "Tag commit", "Microsoft base commit"} {
		if values[label] == "" {
			return provenance{}, fmt.Errorf("missing %s field", label)
		}
	}
	return provenance{Module: values["Module"], Version: values["Version"], Commit: values["Tag commit"], Base: values["Microsoft base commit"]}, nil
}

func replaceProvenance(content string, replacement provenance) (string, error) {
	current, err := provenanceFields(content)
	if err != nil {
		return "", err
	}
	pairs := [][2]string{
		{current.Module, replacement.Module},
		{current.Version, replacement.Version},
		{current.Commit, replacement.Commit},
		{current.Base, replacement.Base},
	}
	labels := []string{"Module", "Version", "Tag commit", "Microsoft base commit"}
	for index, pair := range pairs {
		oldLine := "- " + labels[index] + ": `" + pair[0] + "`"
		newLine := "- " + labels[index] + ": `" + pair[1] + "`"
		if strings.Count(content, oldLine) != 1 {
			return "", fmt.Errorf("expected one %s field", labels[index])
		}
		content = strings.Replace(content, oldLine, newLine, 1)
	}
	return content, nil
}

func commandOutput(name string, arguments ...string) ([]byte, error) {
	return commandOutputIn("", name, arguments...)
}

func commandOutputIn(directory, name string, arguments ...string) ([]byte, error) {
	command := exec.Command(name, arguments...)
	command.Dir = directory
	output, err := command.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("%s: %w: %s", strings.Join(append([]string{name}, arguments...), " "), err, strings.TrimSpace(string(output)))
	}
	return output, nil
}
