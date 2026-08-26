package analysis

import (
	"slices"
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
)

func TestRuleSelectorAppliesOrderedExclusionOverrides(t *testing.T) {
	defaults := namedRules("a", "b", "c")
	selector, err := newRuleSelector("/project", defaults, []RuleOverride{
		{FilePattern: "src/**", Rules: namedRules("a"), ExcludeRules: true},
		{FilePattern: "src/**", ExcludeRules: true},
		{FilePattern: "src/**", Rules: namedRules("a"), ExcludeRules: true},
		{FilePattern: "src/re-enabled.ts", Rules: namedRules("a", "b")},
		{FilePattern: "src/re-enabled.ts", Rules: namedRules("b"), ExcludeRules: true},
	})
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		fileName string
		want     []string
	}{
		{fileName: "/project/outside.ts", want: []string{"a", "b", "c"}},
		{fileName: "/project/src/file.ts", want: []string{"b", "c"}},
		{fileName: "/project/src/re-enabled.ts", want: []string{"a"}},
	}
	for _, test := range tests {
		configured := selector.rulesForFile(test.fileName)
		got := make([]string, len(configured))
		for index := range configured {
			got[index] = configured[index].Name
		}
		if !slices.Equal(got, test.want) {
			t.Errorf("rules for %s = %v, want %v", test.fileName, got, test.want)
		}
	}
}

func namedRules(names ...string) []rule.Rule {
	result := make([]rule.Rule, len(names))
	for index, name := range names {
		result[index].Name = name
	}
	return result
}
