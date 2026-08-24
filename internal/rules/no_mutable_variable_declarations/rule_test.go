package no_mutable_variable_declarations

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-mutable-variable-declarations", Level: "error", Message: "Avoid declaring mutable variables with let. Declare multiple const values to represent each state instead of mutating a single variable, and use immutable values that are not reassigned. When the value must genuinely evolve over time (a module-level counter, a cell shared across closures), hold it in a Ref inside the Effect runtime instead of a let binding.", FilePath: "src/cases.ts", Line: 1, Column: 1},
	})
}
