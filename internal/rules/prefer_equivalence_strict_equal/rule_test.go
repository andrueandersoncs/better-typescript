package prefer_equivalence_strict_equal

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferEquivalenceStrictEqualRule, []analysis.Violation{
		{RuleName: "prefer-equivalence-strict-equal", Level: "error", Message: "Avoid raw strict equality (===). Import Equivalence from effect and replace this comparison with Equivalence.strictEqual<YourType>()(left, right).", FilePath: "violation.ts", Line: 3, Column: 21},
	})
}
