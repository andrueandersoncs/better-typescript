package analysis

import "testing"

func TestMatchGlobSupportsRecursiveDirectories(t *testing.T) {
	pattern := []string{"src", "**", "selected.ts"}
	for _, name := range [][]string{
		{"src", "selected.ts"},
		{"src", "nested", "selected.ts"},
		{"src", "deep", "nested", "selected.ts"},
	} {
		if !matchGlob(pattern, name) {
			t.Errorf("pattern did not match %v", name)
		}
	}
	if matchGlob(pattern, []string{"test", "selected.ts"}) {
		t.Error("pattern matched file outside src")
	}
}

func TestNewFileMatcherRejectsInvalidGlob(t *testing.T) {
	_, err := newFileMatcher("/project", []string{"src/[.ts"})
	if err == nil || err.Error() != "invalid file glob \"src/[.ts\": syntax error in pattern" {
		t.Fatalf("error = %v, want invalid glob error", err)
	}
}
