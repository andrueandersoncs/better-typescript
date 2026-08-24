package prefer_function_composition

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferFunctionCompositionRule, []analysis.Violation{
		{RuleName: "prefer-function-composition", Level: "error", Message: "Avoid block bodies that only bind a value and thread it into a call. Use pipe, flow, or Function.compose (or a related Function combinator) so the steps compose as an expression instead of a manually threaded local. Do not nest the calls.", FilePath: "violation.ts", Line: 2, Column: 44},
	})
}
