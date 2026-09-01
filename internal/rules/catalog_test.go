package rules

import "testing"

func TestBuiltinRules(t *testing.T) {
	if len(BuiltinRules) != 135 {
		t.Fatalf("got %d built-in rules, want 135", len(BuiltinRules))
	}
	seen := make(map[string]struct{}, len(BuiltinRules))
	for index, builtin := range BuiltinRules {
		if _, ok := seen[builtin.Name]; ok {
			t.Fatalf("duplicate rule %q", builtin.Name)
		}
		seen[builtin.Name] = struct{}{}
		if index > 0 && BuiltinRules[index-1].Name >= builtin.Name {
			t.Fatalf("catalog is not sorted at %q", builtin.Name)
		}
	}
}
