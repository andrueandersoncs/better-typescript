package prefer_implicit_return

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferImplicitReturnRule, []analysis.Violation{
		{RuleName: "prefer-implicit-return", Level: "error", Message: "Avoid arrow function block bodies that only return a value. Replace this with an implicit return by removing the return statement and function body braces. Wrap object literals in parentheses when needed.", FilePath: "violation.ts", Line: 1, Column: 28},
	})
}
