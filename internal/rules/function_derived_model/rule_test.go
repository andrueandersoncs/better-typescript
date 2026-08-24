package function_derived_model

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "function-derived-model", Level: "error", Message: "LoadInput is named after its sole function role instead of independent semantics. Remove or deepen the function-data abstraction, or replace this structural-role name with an existing domain concept. A new name must mean more than input, output, options, context, state, or result for one function.", FilePath: "index.ts", Line: 1, Column: 11},
	})
}
