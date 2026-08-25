package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
)

func TestCLIAnalyzesCurrentProject(t *testing.T) {
	binary, packageDirectory := buildCLI(t)
	projectDirectory := filepath.Join(packageDirectory, "testdata", "project")

	command := exec.Command(binary)
	command.Dir = projectDirectory
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	command.Stdout = &stdout
	command.Stderr = &stderr
	if err := command.Run(); err != nil {
		t.Fatalf("run CLI: %v\n%s", err, stderr.String())
	}

	absoluteProject, err := filepath.Abs(projectDirectory)
	if err != nil {
		t.Fatal(err)
	}
	wantStatus := "Analyzing " + absoluteProject + ".\n"
	if stderr.String() != wantStatus {
		t.Fatalf("stderr = %q, want %q", stderr.String(), wantStatus)
	}

	found := map[string]bool{}
	scanner := bufio.NewScanner(&stdout)
	for scanner.Scan() {
		var violation analysis.Violation
		if err := json.Unmarshal(scanner.Bytes(), &violation); err != nil {
			t.Fatalf("parse NDJSON: %v", err)
		}
		var encoded bytes.Buffer
		encoder := json.NewEncoder(&encoded)
		encoder.SetEscapeHTML(false)
		if err := encoder.Encode(violation); err != nil {
			t.Fatal(err)
		}
		wantLine := bytes.TrimSuffix(encoded.Bytes(), []byte("\n"))
		if !bytes.Equal(scanner.Bytes(), wantLine) {
			t.Fatalf("NDJSON line = %s, want exact six-field order %s", scanner.Bytes(), wantLine)
		}
		found[violation.RuleName] = true
	}
	if err := scanner.Err(); err != nil {
		t.Fatal(err)
	}
	for _, ruleName := range []string{"no-error-type", "no-new-error", "no-throw"} {
		if !found[ruleName] {
			t.Errorf("missing representative %s violation", ruleName)
		}
	}
}

func TestCLIExitsOneWhenTsconfigIsMissing(t *testing.T) {
	binary, _ := buildCLI(t)
	projectDirectory := t.TempDir()
	command := exec.Command(binary)
	command.Dir = projectDirectory
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	command.Stdout = &stdout
	command.Stderr = &stderr

	err := command.Run()
	var exitError *exec.ExitError
	if !errors.As(err, &exitError) || exitError.ExitCode() != 1 {
		t.Fatalf("error = %v, want exit code 1", err)
	}
	if stdout.Len() != 0 {
		t.Fatalf("stdout = %q, want empty", stdout.String())
	}
	wantStderr := "Analyzing " + projectDirectory + ".\ntsconfig.json does not exist\n"
	if stderr.String() != wantStderr {
		t.Fatalf("stderr = %q, want %q", stderr.String(), wantStderr)
	}
}

func buildCLI(t *testing.T) (binary string, packageDirectory string) {
	t.Helper()
	_, fileName, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("locate test")
	}
	packageDirectory = filepath.Dir(fileName)
	binary = filepath.Join(t.TempDir(), "better-typescript")
	build := exec.Command("go", "build", "-o", binary, ".")
	build.Dir = packageDirectory
	if output, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build CLI: %v\n%s", err, output)
	}
	return binary, packageDirectory
}

func TestCLISelectsGlobFilesAndOneRule(t *testing.T) {
	binary, packageDirectory := buildCLI(t)
	projectDirectory := filepath.Join(packageDirectory, "testdata", "project")

	command := exec.Command(binary, "--files", "src/missing.ts", "--files", "src/**/selected.ts", "--rules", "no-throw")
	command.Dir = projectDirectory
	output, err := command.Output()
	if err != nil {
		t.Fatal(err)
	}

	violations := decodeViolations(t, output)
	if len(violations) != 1 {
		t.Fatalf("got %d violations, want 1", len(violations))
	}
	if violations[0].FilePath != "src/nested/selected.ts" || violations[0].RuleName != "no-throw" {
		t.Fatalf("violation = %#v, want selected file and no-throw rule", violations[0])
	}
}

func TestCLISelectsManyRules(t *testing.T) {
	binary, packageDirectory := buildCLI(t)
	projectDirectory := filepath.Join(packageDirectory, "testdata", "project")

	command := exec.Command(binary, "--files", "src/main.ts,src/nested/selected.ts", "--rules", "no-error-type", "--rules", "no-throw")
	command.Dir = projectDirectory
	output, err := command.Output()
	if err != nil {
		t.Fatal(err)
	}

	foundRules := map[string]bool{}
	foundFiles := map[string]bool{}
	for _, violation := range decodeViolations(t, output) {
		foundRules[violation.RuleName] = true
		foundFiles[violation.FilePath] = true
	}
	for _, ruleName := range []string{"no-error-type", "no-throw"} {
		if !foundRules[ruleName] {
			t.Errorf("missing %s violation", ruleName)
		}
	}
	if len(foundRules) != 2 {
		t.Fatalf("rules = %#v, want only selected rules", foundRules)
	}
	for _, fileName := range []string{"src/main.ts", "src/nested/selected.ts"} {
		if !foundFiles[fileName] {
			t.Errorf("missing violations for %s", fileName)
		}
	}
	if len(foundFiles) != 2 {
		t.Fatalf("files = %#v, want only selected files", foundFiles)
	}
}

func TestCLIRejectsUnknownRule(t *testing.T) {
	binary, packageDirectory := buildCLI(t)
	projectDirectory := filepath.Join(packageDirectory, "testdata", "project")
	command := exec.Command(binary, "--rules", "not-a-rule")
	command.Dir = projectDirectory
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	command.Stdout = &stdout
	command.Stderr = &stderr

	err := command.Run()
	var exitError *exec.ExitError
	if !errors.As(err, &exitError) || exitError.ExitCode() != 1 {
		t.Fatalf("error = %v, want exit code 1", err)
	}
	if stdout.Len() != 0 {
		t.Fatalf("stdout = %q, want empty", stdout.String())
	}
	if stderr.String() != "unknown rules: not-a-rule\n" {
		t.Fatalf("stderr = %q, want unknown-rule error", stderr.String())
	}
}

func decodeViolations(t *testing.T, output []byte) []analysis.Violation {
	t.Helper()
	violations := make([]analysis.Violation, 0)
	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		var violation analysis.Violation
		if err := json.Unmarshal(scanner.Bytes(), &violation); err != nil {
			t.Fatalf("parse NDJSON: %v", err)
		}
		violations = append(violations, violation)
	}
	if err := scanner.Err(); err != nil {
		t.Fatal(err)
	}
	return violations
}
