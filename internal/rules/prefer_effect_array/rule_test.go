package prefer_effect_array

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-array", Level: "error", Message: "Avoid Array.prototype.map(). Prefer Effect's Array module — define the array as a const and call Array.every(values, Boolean), Array.map(values, f), Array.filter(values, f), or the matching Array.* helper — instead of invoking Array.prototype methods directly on array values.", FilePath: "violation.ts", Line: 2, Column: 17},
	})
}
