package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
)

func TestCLIAnalyzesCurrentProject(t *testing.T) {
	_, fileName, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("locate test")
	}
	packageDirectory := filepath.Dir(fileName)
	projectDirectory := filepath.Join(packageDirectory, "testdata", "project")
	binary := filepath.Join(t.TempDir(), "better-typescript")

	build := exec.Command("go", "build", "-o", binary, ".")
	build.Dir = packageDirectory
	if output, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build CLI: %v\n%s", err, output)
	}

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
