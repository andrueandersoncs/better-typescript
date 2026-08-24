package prefer_option_match

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferOptionMatchRule, []analysis.Violation{
		{RuleName: "prefer-option-match", Level: "error", Message: "Avoid using Option.isSome/isNone in a ternary to unwrap an Option. Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) instead of manually checking and accessing .value.", FilePath: "violation.ts", Line: 3, Column: 23},
	})
}
