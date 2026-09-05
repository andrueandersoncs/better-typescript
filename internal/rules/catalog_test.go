package rules

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"
)

func TestBuiltinRules(t *testing.T) {
	seen := make(map[string]struct{}, len(BuiltinRules))
	var names []string
	for index, builtin := range BuiltinRules {
		if _, ok := seen[builtin.Name]; ok {
			t.Fatalf("duplicate rule %q", builtin.Name)
		}
		seen[builtin.Name] = struct{}{}
		names = append(names, builtin.Name)
		if index > 0 && BuiltinRules[index-1].Name >= builtin.Name {
			t.Fatalf("catalog is not sorted at %q", builtin.Name)
		}
	}
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatal(err)
	}
	for _, entry := range entries {
		if entry.IsDir() && entry.Name() != "testdata" {
			sources, err := filepath.Glob(filepath.Join(entry.Name(), "*.go"))
			if err != nil {
				t.Fatal(err)
			}
			if len(sources) == 0 {
				continue
			}
			name := strings.ReplaceAll(entry.Name(), "_", "-")
			if _, ok := seen[name]; !ok {
				t.Errorf("rule package %q is not registered", entry.Name())
			}
		}
	}
	pages, err := filepath.Glob("../../docs/rules/*.md")
	if err != nil {
		t.Fatal(err)
	}
	for _, page := range pages {
		name := strings.TrimSuffix(filepath.Base(page), ".md")
		if _, ok := seen[name]; !ok {
			t.Errorf("public rule page %q has no registered rule", name)
		}
	}
	index, err := os.ReadFile("../../docs/rules.md")
	if err != nil {
		t.Fatal(err)
	}
	var documented []string
	for _, match := range regexp.MustCompile("(?m)^- \\[`([^`]+)`\\]").FindAllStringSubmatch(string(index), -1) {
		documented = append(documented, match[1])
	}
	if !slices.Equal(documented, names) {
		t.Errorf("public rule index = %v, want %v", documented, names)
	}
	if !strings.Contains(string(index), fmt.Sprintf("contains these %d rules:", len(BuiltinRules))) {
		t.Error("public rule count differs from the catalog")
	}
}
