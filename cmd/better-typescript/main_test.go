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
