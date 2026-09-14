package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestPublishReleaseDefaultsToNextPatch(t *testing.T) {
	bin := t.TempDir()
	writeExecutable(t, filepath.Join(bin, "npm"), "#!/bin/sh\nif [ \"$1\" = view ]; then printf '0.4.16\\n'; exit 0; fi\nexit 99\n")
	writeExecutable(t, filepath.Join(bin, "git"), "#!/bin/sh\nprintf 'dirty\\n'\n")

	output, err := runPublishRelease(t, bin)
	if err == nil || !strings.Contains(output, "release version 0.4.17") {
		t.Fatalf("output = %q, error = %v", output, err)
	}
}

func TestPublishReleaseUsesExplicitVersion(t *testing.T) {
	bin := t.TempDir()
	called := filepath.Join(bin, "npm-called")
	writeExecutable(t, filepath.Join(bin, "npm"), "#!/bin/sh\ntouch \"$FAKE_NPM_CALLED\"\nexit 99\n")
	writeExecutable(t, filepath.Join(bin, "git"), "#!/bin/sh\nprintf 'dirty\\n'\n")

	output, err := runPublishRelease(t, bin, "1.2.3")
	if err == nil || !strings.Contains(output, "release version 1.2.3") {
		t.Fatalf("output = %q, error = %v", output, err)
	}
	if _, statErr := os.Stat(called); !os.IsNotExist(statErr) {
		t.Fatalf("npm was called for an explicit version: %v", statErr)
	}
}

func runPublishRelease(t *testing.T, bin string, arguments ...string) (string, error) {
	t.Helper()
	command := exec.Command("./publish-npm-release.sh", arguments...)
	command.Env = append(os.Environ(), "PATH="+bin+string(os.PathListSeparator)+os.Getenv("PATH"), "FAKE_NPM_CALLED="+filepath.Join(bin, "npm-called"))
	output, err := command.CombinedOutput()
	return string(output), err
}

func writeExecutable(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o755); err != nil {
		t.Fatal(err)
	}
}
