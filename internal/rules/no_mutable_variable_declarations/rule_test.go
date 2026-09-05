package no_mutable_variable_declarations

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-mutable-variable-declarations", Level: "error", Message: "Avoid declaring mutable variables with let. Application code should declare multiple const values to represent each state instead of mutating one variable. When shared state genuinely evolves over time, use a Ref inside the Effect runtime instead of a let binding. An owned library kernel may use local mutation only under explicit project policy; this rule does not infer that exception.", FilePath: "src/cases.ts", Line: 1, Column: 1},
	})
}
