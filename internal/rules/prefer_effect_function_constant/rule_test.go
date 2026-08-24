package prefer_effect_function_constant

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-function-constant", Level: "error", Message: "Avoid a handwritten constant thunk. Use Function.constant(42) from Effect when a zero-argument function only returns a stable value. Function.constant captures that value once and returns a zero-argument function.", FilePath: "violation.ts", Line: 1, Column: 16},
	})
}
