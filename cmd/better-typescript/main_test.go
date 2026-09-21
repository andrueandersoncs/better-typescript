package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"os"
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
	err := command.Run()
	var exitError *exec.ExitError
	if !errors.As(err, &exitError) || exitError.ExitCode() != 1 {
		t.Fatalf("error = %v, want exit code 1\n%s", err, stderr.String())
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

func TestCLIExitsZeroWhenNoErrorsAreReported(t *testing.T) {
	binary, packageDirectory := buildCLI(t)
	projectDirectory := filepath.Join(packageDirectory, "testdata", "project")
	command := exec.Command(binary, "--files", "src/main.ts", "--rules", "no-undefined")
	command.Dir = projectDirectory

	output, err := command.Output()
	if err != nil {
		t.Fatal(err)
	}
	if len(output) != 0 {
		t.Fatalf("stdout = %q, want empty", output)
	}
}

func TestCLIHelpExitsZero(t *testing.T) {
	binary, _ := buildCLI(t)
	command := exec.Command(binary, "--help")

	output, err := command.Output()
	if err != nil {
		t.Fatal(err)
	}
	want := "Usage: better-typescript [--files glob] [--rules name]\n       better-typescript semantic [options]\nRepeat flags or separate values with commas. better-typescript.json supplies per-file rule commands.\n"
	if string(output) != want {
		t.Fatalf("stdout = %q, want %q", output, want)
	}
}

func TestCLISemanticHelpExitsZero(t *testing.T) {
	binary, _ := buildCLI(t)
	command := exec.Command(binary, "semantic", "--help")

	output, err := command.Output()
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(output, []byte("Usage: better-typescript semantic [options]\n")) ||
		!bytes.Contains(output, []byte("--review-context <path>  Text file with requirements, rationale, or measurements needed by review rules")) {
		t.Fatalf("stdout = %q, want semantic usage explaining review context", output)
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
	output := outputWithExitCode(t, command, 1)

	violations := decodeViolations(t, output)
	if len(violations) != 1 {
		t.Fatalf("got %d violations, want 1", len(violations))
	}
	if violations[0].FilePath != "src/nested/selected.ts" || violations[0].RuleName != "no-throw" {
		t.Fatalf("violation = %#v, want selected file and no-throw rule", violations[0])
	}
}

func TestCLIIgnoresSemanticRuleCommands(t *testing.T) {
	binary, packageDirectory := buildCLI(t)
	projectDirectory := t.TempDir()
	if err := os.CopyFS(projectDirectory, os.DirFS(filepath.Join(packageDirectory, "testdata", "project"))); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		filepath.Join(projectDirectory, "better-typescript.json"),
		[]byte(`{"commands":[
			{"type":"add_exclusions","files":"src/**","rules":["no-error-type"]},
			{"mode":"semantic","type":"add_exclusions","files":"src/nested/**","rules":["no-throw"]}
		]}`),
		0o600,
	); err != nil {
		t.Fatal(err)
	}

	command := exec.Command(binary)
	command.Dir = projectDirectory
	violations := decodeViolations(t, outputWithExitCode(t, command, 1))
	noThrowFiles := map[string]bool{}
	for _, violation := range violations {
		if violation.RuleName == "no-error-type" {
			t.Fatalf("deterministic exclusion was not applied: %#v", violation)
		}
		if violation.RuleName == "no-throw" {
			noThrowFiles[violation.FilePath] = true
		}
	}
	for _, file := range []string{"src/main.ts", "src/nested/selected.ts"} {
		if !noThrowFiles[file] {
			t.Fatalf("semantic command affected deterministic rules for %s", file)
		}
	}
}

func TestCLIWildcardExcludesAllDeterministicRules(t *testing.T) {
	binary, packageDirectory := buildCLI(t)
	projectDirectory := t.TempDir()
	if err := os.CopyFS(projectDirectory, os.DirFS(filepath.Join(packageDirectory, "testdata", "project"))); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		filepath.Join(projectDirectory, "better-typescript.json"),
		[]byte(`{"commands":[{"type":"add_exclusions","files":"src/**","rules":"*"}]}`),
		0o600,
	); err != nil {
		t.Fatal(err)
	}

	command := exec.Command(binary)
	command.Dir = projectDirectory
	output, err := command.Output()
	if err != nil {
		t.Fatal(err)
	}
	if len(output) != 0 {
		t.Fatalf("stdout = %q, want no violations", output)
	}
}

func TestCLISelectsManyRules(t *testing.T) {
	binary, packageDirectory := buildCLI(t)
	projectDirectory := filepath.Join(packageDirectory, "testdata", "project")

	command := exec.Command(binary, "--files", "src/main.ts,src/nested/selected.ts", "--rules", "no-error-type", "--rules", "no-throw")
	command.Dir = projectDirectory
	output := outputWithExitCode(t, command, 1)

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

func TestCLIUsesCascadingJSONRuleConfiguration(t *testing.T) {
	binary, packageDirectory := buildCLI(t)
	projectDirectory := filepath.Join(packageDirectory, "testdata", "config-project")

	command := exec.Command(binary)
	command.Dir = projectDirectory
	output := outputWithExitCode(t, command, 1)

	violations := decodeViolations(t, output)
	seen := make(map[string]map[string]bool)
	for _, violation := range violations {
		if seen[violation.FilePath] == nil {
			seen[violation.FilePath] = make(map[string]bool)
		}
		seen[violation.FilePath][violation.RuleName] = true
	}
	tests := []struct {
		file string
		rule string
		want bool
	}{
		{file: "src/main.ts", rule: "no-error-type", want: true},
		{file: "src/main.ts", rule: "no-throw", want: true},
		{file: "src/nested/selected.ts", rule: "no-error-type", want: true},
		{file: "src/nested/selected.ts", rule: "no-throw", want: false},
		{file: "src/nested/disabled.ts", rule: "no-error-type", want: false},
		{file: "src/nested/disabled.ts", rule: "no-throw", want: false},
	}
	for _, test := range tests {
		if seen[test.file][test.rule] != test.want {
			t.Errorf("%s on %s = %t, want %t", test.rule, test.file, seen[test.file][test.rule], test.want)
		}
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

func outputWithExitCode(t *testing.T, command *exec.Cmd, want int) []byte {
	t.Helper()
	output, err := command.Output()
	var exitError *exec.ExitError
	if !errors.As(err, &exitError) || exitError.ExitCode() != want {
		t.Fatalf("error = %v, want exit code %d", err, want)
	}
	return output
}
