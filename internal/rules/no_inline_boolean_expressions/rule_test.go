package no_inline_boolean_expressions

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-inline-boolean-expressions", Level: "error", Message: "Avoid boolean operators inline in an if statement condition. Extract the expression into a well-named const variable declaration above the if statement and use that variable in the if condition.", FilePath: "src/cases.ts", Line: 2, Column: 5},
	})
}
