package no_multiple_boolean_operators

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-multiple-boolean-operators", Level: "error", Message: "Avoid combining more than one boolean operator in a single expression. Declare multiple constant variables instead of combining operators into a single expression.", FilePath: "src/cases.ts", Line: 2, Column: 19},
	})
}
