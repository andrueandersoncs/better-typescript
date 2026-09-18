package analysis

import "testing"

func TestNewFileMatcherRejectsInvalidGlob(t *testing.T) {
	_, err := newFileMatcher("/project", []string{"src/[.ts"})
	if err == nil || err.Error() != "invalid file glob \"src/[.ts\": syntax error in pattern" {
		t.Fatalf("error = %v, want invalid glob error", err)
	}
}
