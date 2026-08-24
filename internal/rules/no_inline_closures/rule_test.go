package no_inline_closures

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-inline-closures", Level: "error", Message: "Avoid arrow functions outside naming, currying, and third-party callback positions. Name this function as a top-level const and pass it by reference, currying it when it needs values from the enclosing scope. Inline arrows are permitted only as arguments to third-party functions. When the expression sequences several steps, prefer a generator over nesting functions.", FilePath: "src/cases.ts", Line: 1, Column: 40},
	})
}
