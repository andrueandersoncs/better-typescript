package no_inline_closures

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-inline-closures", Level: "error", Message: "Avoid arrow functions outside naming, currying, and external API callback positions. Name this function as a top-level const and pass it by reference, currying it when it needs values from the enclosing scope. Inline arrows are permitted only as arguments to externally declared functions and constructors. When the expression sequences several steps, prefer a generator over nesting functions.", FilePath: "src/cases.ts", Line: 3, Column: 40},
		{RuleName: "no-inline-closures", Level: "error", Message: "Avoid arrow functions outside naming, currying, and external API callback positions. Name this function as a top-level const and pass it by reference, currying it when it needs values from the enclosing scope. Inline arrows are permitted only as arguments to externally declared functions and constructors. When the expression sequences several steps, prefer a generator over nesting functions.", FilePath: "src/cases.ts", Line: 9, Column: 23},
		{RuleName: "no-inline-closures", Level: "error", Message: "Avoid arrow functions outside naming, currying, and external API callback positions. Name this function as a top-level const and pass it by reference, currying it when it needs values from the enclosing scope. Inline arrows are permitted only as arguments to externally declared functions and constructors. When the expression sequences several steps, prefer a generator over nesting functions.", FilePath: "src/cases.ts", Line: 15, Column: 24},
	})
}
