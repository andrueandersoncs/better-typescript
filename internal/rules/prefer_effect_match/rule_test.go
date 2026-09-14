package prefer_effect_match

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-match", Level: "error", Message: "Use Match from Effect instead of a chained literal ternary. Match the repeated value with Match.value and Match.when, then finish with Match.exhaustive or Match.orElse.", FilePath: "cases.ts", Line: 2, Column: 17},
		{RuleName: "prefer-effect-match", Level: "error", Message: "Use Match from Effect instead of a chained literal ternary. Match the repeated value with Match.value and Match.when, then finish with Match.exhaustive or Match.orElse.", FilePath: "cases.ts", Line: 7, Column: 24},
	})
}
