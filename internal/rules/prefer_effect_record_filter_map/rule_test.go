package prefer_effect_record_filter_map

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-record-filter-map", Level: "error", Message: "Avoid conditional object spreads. Build a record of candidate properties and use Record.filterMap from Effect with Result.succeed/Result.fail (or Result.fromNullishOr) to keep only present entries.", FilePath: "violation.ts", Line: 2, Column: 17},
	})
}
