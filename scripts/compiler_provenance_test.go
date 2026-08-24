package main

import (
	"strings"
	"testing"
)

func TestReplaceProvenance(t *testing.T) {
	original := strings.Join([]string{
		"before",
		"- Module: `old/module`",
		"- Version: `v1.0.0`",
		"- Tag commit: `old-commit`",
		"- Microsoft base commit: `old-base`",
		"after",
	}, "\n")
	want := provenance{Module: compilerModule, Version: "v2.0.0", Commit: "new-commit", Base: "new-base"}

	updated, err := replaceProvenance(original, want)
	if err != nil {
		t.Fatal(err)
	}
	got, err := provenanceFields(updated)
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("got %#v, want %#v", got, want)
	}
	if !strings.HasPrefix(updated, "before\n") || !strings.HasSuffix(updated, "\nafter") {
		t.Fatalf("unrelated text changed: %q", updated)
	}
}

func TestProvenanceFieldsRejectsMissingField(t *testing.T) {
	_, err := provenanceFields("- Module: `module`")
	if err == nil || !strings.Contains(err.Error(), "missing Version field") {
		t.Fatalf("got %v, want missing Version field error", err)
	}
}
