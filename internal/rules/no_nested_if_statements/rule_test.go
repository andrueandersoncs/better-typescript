package no_nested_if_statements

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-nested-if-statements", Level: "error", Message: "Avoid nesting if statements. Combine related conditions with boolean operators, or use an early return so this condition can remain a single-level if statement.", FilePath: "src/cases.ts", Line: 3, Column: 2},
	})
}
