package prefer_effect_array_append_all

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-array-append-all", Level: "error", Message: "Avoid conditional array spreads. Use Array.appendAll from Effect to combine arrays instead of spreading a conditional expression that chooses between an array and an empty array literal.", FilePath: "violation.ts", Line: 2, Column: 20},
	})
}
