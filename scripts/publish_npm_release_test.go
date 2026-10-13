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

func TestPublishPackageRefusesLauncherBeforeItsPlatformPackages(t *testing.T) {
	for _, test := range []struct {
		name      string
		published string
		publishes bool
	}{
		{"platform missing", "@scope/launcher-darwin-arm64@1.2.3", false},
		{"platforms present", "@scope/launcher-darwin-arm64@1.2.3 @scope/launcher-linux-arm64@1.2.3", true},
	} {
		t.Run(test.name, func(t *testing.T) {
			bin := t.TempDir()
			published := filepath.Join(bin, "published")
			// npm view succeeds only for listed platform packages; npm publish records the call.
			writeExecutable(t, filepath.Join(bin, "npm"), `#!/bin/sh
if [ "$1" = publish ]; then touch "$FAKE_NPM_PUBLISHED"; exit 0; fi
for package in $FAKE_NPM_EXISTING; do [ "$2" = "$package" ] && exit 0; done
echo "npm error code E404" >&2
exit 1
`)
			archive := writeLauncherArchive(t, `{"name":"@scope/launcher","version":"1.2.3","optionalDependencies":{"@scope/launcher-darwin-arm64":"1.2.3","@scope/launcher-linux-arm64":"1.2.3"}}`)
			command := exec.Command("./publish-npm-package.sh", archive)
			command.Env = append(os.Environ(),
				"PATH="+bin+string(os.PathListSeparator)+os.Getenv("PATH"),
				"FAKE_NPM_EXISTING="+test.published,
				"FAKE_NPM_PUBLISHED="+published,
				"BETTER_TYPESCRIPT_NPM_WAIT_SECONDS=0",
			)
			output, err := command.CombinedOutput()
			_, statErr := os.Stat(published)
			if test.publishes != (err == nil) || test.publishes != (statErr == nil) {
				t.Fatalf("output = %q, error = %v, published = %v", output, err, statErr == nil)
			}
			if !test.publishes && !strings.Contains(string(output), "@scope/launcher-linux-arm64@1.2.3 is not on the registry") {
				t.Fatalf("output = %q", output)
			}
		})
	}
}

func writeLauncherArchive(t *testing.T, packageJSON string) string {
	t.Helper()
	directory := t.TempDir()
	if err := os.MkdirAll(filepath.Join(directory, "package"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(directory, "package", "package.json"), []byte(packageJSON), 0o644); err != nil {
		t.Fatal(err)
	}
	archive := filepath.Join(directory, "launcher.tgz")
	if output, err := exec.Command("tar", "-czf", archive, "-C", directory, "package").CombinedOutput(); err != nil {
		t.Fatalf("tar: %v\n%s", err, output)
	}
	return archive
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
