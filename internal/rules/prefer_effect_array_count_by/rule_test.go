package prefer_effect_array_count_by

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-array-count-by", Level: "error", Message: "Avoid filtering an array only to count matching elements. Replace Array.filter(values, predicate).length with Array.countBy(values, predicate) from Effect. Remove a surrounding helper when that is its only behavior.", FilePath: "violation.ts", Line: 2, Column: 15},
	})
}
