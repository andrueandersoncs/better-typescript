package npm_test

import (
	"archive/tar"
	"bufio"
	"bytes"
	"compress/gzip"
	"crypto/sha512"
	"debug/buildinfo"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"testing"
)

const testVersion = "0.0.0-test.0"

var platformPackages = []struct {
	directory string
	name      string
	goos      string
	goarch    string
	os        string
	cpu       string
}{
	{"better-typescript-darwin-amd64", "@andrueandersoncs/better-typescript-darwin-amd64", "darwin", "amd64", "darwin", "x64"},
	{"better-typescript-darwin-arm64", "@andrueandersoncs/better-typescript-darwin-arm64", "darwin", "arm64", "darwin", "arm64"},
	{"better-typescript-linux-amd64", "@andrueandersoncs/better-typescript-linux-amd64", "linux", "amd64", "linux", "x64"},
	{"better-typescript-linux-arm64", "@andrueandersoncs/better-typescript-linux-arm64", "linux", "arm64", "linux", "arm64"},
}

type manifest struct {
	Name                 string            `json:"name"`
	Version              string            `json:"version"`
	Private              bool              `json:"private"`
	OS                   []string          `json:"os"`
	CPU                  []string          `json:"cpu"`
	Bin                  map[string]string `json:"bin"`
	Scripts              map[string]string `json:"scripts"`
	OptionalDependencies map[string]string `json:"optionalDependencies"`
}

func TestNpmPackages(t *testing.T) {
	repository := repositoryRoot(t)
	testOutputGuards(t, repository)
	stage := filepath.Join(t.TempDir(), "stage")
	run(t, repository, filepath.Join(repository, "scripts", "build-npm-packages.sh"), testVersion, stage)

	archives := packAndCheck(t, repository, stage)
	testResumablePublish(t, repository, archives["better-typescript"])
	run(t, repository, filepath.Join(repository, "scripts", "test-npm-packages.sh"), filepath.Dir(archives["better-typescript"]), filepath.Join(repository, "npm", "testdata", "project"))
	testInstalledLauncher(t, repository, archives)
	testMissingOptionalPackage(t, archives["better-typescript"])
}

func testOutputGuards(t *testing.T, repository string) {
	t.Helper()
	buildOutput := t.TempDir()
	buildSentinel := filepath.Join(buildOutput, "keep")
	if err := os.WriteFile(buildSentinel, []byte("keep"), 0o644); err != nil {
		t.Fatal(err)
	}
	runFailure(t, repository, filepath.Join(repository, "scripts", "build-npm-packages.sh"), testVersion, buildOutput)
	if _, err := os.Stat(buildSentinel); err != nil {
		t.Fatalf("build removed unowned output: %v", err)
	}

	packOutput := t.TempDir()
	packSentinel := filepath.Join(packOutput, "keep")
	if err := os.WriteFile(packSentinel, []byte("keep"), 0o644); err != nil {
		t.Fatal(err)
	}
	runFailure(t, repository, filepath.Join(repository, "scripts", "pack-npm-packages.sh"), t.TempDir(), packOutput)
	if _, err := os.Stat(packSentinel); err != nil {
		t.Fatalf("pack removed unowned output: %v", err)
	}
}

func packAndCheck(t *testing.T, repository, stage string) map[string]string {
	t.Helper()
	archiveDirectory := filepath.Join(t.TempDir(), "archives")

	launcher := readManifest(t, filepath.Join(stage, "better-typescript", "package.json"))
	if launcher.Name != "@andrueandersoncs/better-typescript" || launcher.Version != testVersion || launcher.Private {
		t.Fatalf("launcher manifest = %#v", launcher)
	}
	if launcher.Bin["better-typescript"] != "bin/better-typescript.js" || len(launcher.Scripts) != 0 {
		t.Fatalf("launcher command metadata = %#v", launcher)
	}
	if len(launcher.OptionalDependencies) != len(platformPackages) {
		t.Fatalf("optional dependencies = %#v", launcher.OptionalDependencies)
	}
	for _, platform := range platformPackages {
		if launcher.OptionalDependencies[platform.name] != testVersion {
			t.Errorf("optional dependency %s = %q", platform.name, launcher.OptionalDependencies[platform.name])
		}
	}

	packages := []string{"better-typescript"}
	for _, platform := range platformPackages {
		packages = append(packages, platform.directory)
		got := readManifest(t, filepath.Join(stage, platform.directory, "package.json"))
		if got.Name != platform.name || got.Version != testVersion || got.Private {
			t.Errorf("%s manifest = %#v", platform.directory, got)
		}
		if strings.Join(got.OS, ",") != platform.os || strings.Join(got.CPU, ",") != platform.cpu {
			t.Errorf("%s platform = %v/%v", platform.directory, got.OS, got.CPU)
		}
		if len(got.Scripts) != 0 || len(got.Bin) != 0 {
			t.Errorf("%s exposes scripts or a command: %#v", platform.directory, got)
		}
		checkDependencyNotice(t, filepath.Join(stage, platform.directory))
	}

	run(t, repository, filepath.Join(repository, "scripts", "pack-npm-packages.sh"), stage, archiveDirectory)
	archives := make(map[string]string)
	for _, directory := range packages {
		archive := onlyMatchingFile(t, archiveDirectory, "*"+directory+"-"+testVersion+".tgz")
		archives[directory] = archive
		checkArchive(t, archive, directory == "better-typescript")
	}
	return archives
}

func checkArchive(t *testing.T, path string, launcher bool) {
	t.Helper()
	file, err := os.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	compressed, err := gzip.NewReader(file)
	if err != nil {
		t.Fatal(err)
	}
	defer compressed.Close()

	entries := make(map[string]int64)
	dependencyNotice := ""
	reader := tar.NewReader(compressed)
	for {
		header, err := reader.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		entries[header.Name] = header.Mode
		if header.Name == "package/BINARY-DEPENDENCIES.txt" {
			content, err := io.ReadAll(reader)
			if err != nil {
				t.Fatal(err)
			}
			dependencyNotice = string(content)
		}
	}

	want := []string{
		"package/LICENSE",
		"package/README.md",
		"package/package.json",
	}
	executable := "package/bin/better-typescript"
	if launcher {
		executable += ".js"
	} else {
		want = append(want,
			"package/BINARY-DEPENDENCIES.txt",
			"package/LICENSES/tsgolint-LICENSE",
			"package/LICENSES/typescript-go-NOTICE.txt",
			"package/THIRD-PARTY-NOTICES.md",
		)
		for _, line := range strings.Split(dependencyNotice, "\n") {
			parts := strings.SplitN(line, ": ", 2)
			if len(parts) == 2 && strings.HasPrefix(parts[0], "- ") {
				want = append(want, "package/"+parts[1])
			}
		}
	}
	want = append(want, executable)
	sort.Strings(want)
	got := make([]string, 0, len(entries))
	for name := range entries {
		got = append(got, name)
	}
	sort.Strings(got)
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("%s entries:\n%s\nwant:\n%s", path, strings.Join(got, "\n"), strings.Join(want, "\n"))
	}
	if entries[executable]&0o111 == 0 {
		t.Fatalf("%s mode = %#o, want executable", executable, entries[executable])
	}
}

func checkDependencyNotice(t *testing.T, packageDirectory string) {
	t.Helper()
	info, err := buildinfo.ReadFile(filepath.Join(packageDirectory, "bin", "better-typescript"))
	if err != nil {
		t.Fatal(err)
	}
	content, err := os.ReadFile(filepath.Join(packageDirectory, "BINARY-DEPENDENCIES.txt"))
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(content)), "\n")
	entries := make(map[string]bool)
	for _, line := range lines {
		if strings.HasPrefix(line, "- ") {
			entries[strings.TrimPrefix(strings.SplitN(line, ": ", 2)[0], "- ")] = true
		}
	}
	if len(entries) != len(info.Deps) {
		t.Fatalf("dependency notice has %d entries, binary has %d", len(entries), len(info.Deps))
	}
	for _, dependency := range info.Deps {
		if !entries[dependency.Path+"@"+dependency.Version] {
			t.Errorf("dependency notice lacks %s@%s", dependency.Path, dependency.Version)
		}
	}
}

func testResumablePublish(t *testing.T, repository, archive string) {
	t.Helper()
	content, err := os.ReadFile(archive)
	if err != nil {
		t.Fatal(err)
	}
	digest := sha512.Sum512(content)
	integrity := "sha512-" + base64.StdEncoding.EncodeToString(digest[:])
	fakeDirectory := t.TempDir()
	published := filepath.Join(fakeDirectory, "published")
	fakeNpm := filepath.Join(fakeDirectory, "npm")
	fake := "#!/usr/bin/env bash\nif [[ $1 == view ]]; then\n  if [[ ${FAKE_NPM_MISSING:-} == 1 ]]; then echo 'npm error code E404' >&2; exit 1; fi\n  printf '%s\\n' \"$FAKE_NPM_INTEGRITY\"\n  exit 0\nfi\ntouch \"$FAKE_NPM_PUBLISHED\"\n"
	if err := os.WriteFile(fakeNpm, []byte(fake), 0o755); err != nil {
		t.Fatal(err)
	}

	publish := func(missing bool) {
		missingValue := "0"
		if missing {
			missingValue = "1"
		}
		command := exec.Command(filepath.Join(repository, "scripts", "publish-npm-package.sh"), archive)
		command.Dir = repository
		command.Env = append(cleanEnvironment(),
			"PATH="+fakeDirectory+string(os.PathListSeparator)+os.Getenv("PATH"),
			"FAKE_NPM_INTEGRITY="+integrity,
			"FAKE_NPM_PUBLISHED="+published,
			"FAKE_NPM_MISSING="+missingValue,
		)
		if output, err := command.CombinedOutput(); err != nil {
			t.Fatalf("publish resume test: %v\n%s", err, output)
		}
	}
	publish(false)
	if _, err := os.Stat(published); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("matching published package was republished")
	}
	publish(true)
	if _, err := os.Stat(published); err != nil {
		t.Fatalf("missing package was not published: %v", err)
	}
}

func testInstalledLauncher(t *testing.T, repository string, archives map[string]string) {
	t.Helper()
	host := hostPackage(t)
	consumer := t.TempDir()
	copyDirectory(t, filepath.Join(repository, "npm", "testdata", "project"), consumer)

	run(t, consumer, "npm", "install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", archives["better-typescript"], archives[host])
	command := installedCommand(consumer)
	stdout, stderr, code := commandOutput(command, consumer)
	if code != 0 {
		t.Fatalf("installed command exit = %d\nstderr:\n%s", code, stderr)
	}
	consumer = canonicalDirectory(t, consumer)
	if stderr != "Analyzing "+consumer+".\n" {
		t.Fatalf("stderr = %q", stderr)
	}

	foundThrow := false
	scanner := bufio.NewScanner(strings.NewReader(stdout))
	for scanner.Scan() {
		var violation struct {
			RuleName string `json:"ruleName"`
		}
		if err := json.Unmarshal(scanner.Bytes(), &violation); err != nil {
			t.Fatalf("parse NDJSON: %v", err)
		}
		foundThrow = foundThrow || violation.RuleName == "no-throw"
	}
	if err := scanner.Err(); err != nil {
		t.Fatal(err)
	}
	if !foundThrow {
		t.Fatalf("stdout lacks no-throw violation:\n%s", stdout)
	}

	empty := t.TempDir()
	stdout, stderr, code = commandOutput(command, empty)
	empty = canonicalDirectory(t, empty)
	if code != 1 || stdout != "" || stderr != "Analyzing "+empty+".\ntsconfig.json does not exist\n" {
		t.Fatalf("missing tsconfig: exit=%d stdout=%q stderr=%q", code, stdout, stderr)
	}
}

func testMissingOptionalPackage(t *testing.T, launcherArchive string) {
	t.Helper()
	consumer := t.TempDir()
	if err := os.WriteFile(filepath.Join(consumer, "package.json"), []byte("{\"private\":true}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run(t, consumer, "npm", "install", "--offline", "--omit=optional", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", launcherArchive)
	stdout, stderr, code := commandOutput(installedCommand(consumer), consumer)
	if code != 1 || stdout != "" || !strings.Contains(stderr, "Reinstall with optional dependencies enabled.") {
		t.Fatalf("missing optional package: exit=%d stdout=%q stderr=%q", code, stdout, stderr)
	}
}

func hostPackage(t *testing.T) string {
	t.Helper()
	architecture := runtime.GOARCH
	if architecture == "amd64" || architecture == "arm64" {
		for _, platform := range platformPackages {
			if platform.goos == runtime.GOOS && platform.goarch == architecture {
				return platform.directory
			}
		}
	}
	t.Skipf("no executable package for %s/%s", runtime.GOOS, runtime.GOARCH)
	return ""
}

func installedCommand(consumer string) string {
	return filepath.Join(consumer, "node_modules", ".bin", "better-typescript")
}

func commandOutput(name, directory string) (string, string, int) {
	command := exec.Command(name)
	command.Dir = directory
	command.Env = cleanEnvironment()
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	command.Stdout = &stdout
	command.Stderr = &stderr
	err := command.Run()
	if err == nil {
		return stdout.String(), stderr.String(), 0
	}
	var exitError *exec.ExitError
	if errors.As(err, &exitError) {
		return stdout.String(), stderr.String(), exitError.ExitCode()
	}
	return stdout.String(), fmt.Sprintf("%v: %s", err, stderr.String()), -1
}

func canonicalDirectory(t *testing.T, directory string) string {
	t.Helper()
	resolved, err := filepath.EvalSymlinks(directory)
	if err != nil {
		t.Fatal(err)
	}
	return resolved
}

func readManifest(t *testing.T, path string) manifest {
	t.Helper()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var value manifest
	if err := json.Unmarshal(content, &value); err != nil {
		t.Fatal(err)
	}
	return value
}

func onlyMatchingFile(t *testing.T, directory, pattern string) string {
	t.Helper()
	matches, err := filepath.Glob(filepath.Join(directory, pattern))
	if err != nil {
		t.Fatal(err)
	}
	if len(matches) != 1 {
		t.Fatalf("%s matched %v", pattern, matches)
	}
	return matches[0]
}

func copyDirectory(t *testing.T, source, destination string) {
	t.Helper()
	err := filepath.WalkDir(source, func(path string, entry os.DirEntry, walkError error) error {
		if walkError != nil {
			return walkError
		}
		relative, err := filepath.Rel(source, path)
		if err != nil {
			return err
		}
		target := filepath.Join(destination, relative)
		if entry.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(target, content, 0o644)
	})
	if err != nil {
		t.Fatal(err)
	}
}

func repositoryRoot(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("locate npm test")
	}
	return filepath.Dir(filepath.Dir(file))
}

func run(t *testing.T, directory, name string, arguments ...string) {
	t.Helper()
	command := exec.Command(name, arguments...)
	command.Dir = directory
	command.Env = cleanEnvironment()
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("%s %s: %v\n%s", name, strings.Join(arguments, " "), err, output)
	}
}

func runFailure(t *testing.T, directory, name string, arguments ...string) {
	t.Helper()
	command := exec.Command(name, arguments...)
	command.Dir = directory
	command.Env = cleanEnvironment()
	if output, err := command.CombinedOutput(); err == nil {
		t.Fatalf("%s %s succeeded, want failure\n%s", name, strings.Join(arguments, " "), output)
	}
}

func cleanEnvironment() []string {
	environment := make([]string, 0, len(os.Environ())+1)
	for _, value := range os.Environ() {
		if strings.HasPrefix(value, "FORCE_COLOR=") || strings.HasPrefix(value, "NO_COLOR=") {
			continue
		}
		environment = append(environment, value)
	}
	return append(environment, "NO_COLOR=1")
}
