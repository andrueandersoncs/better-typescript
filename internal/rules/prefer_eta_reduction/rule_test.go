package prefer_eta_reduction

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferEtaReductionRule, []analysis.Violation{
		{RuleName: "prefer-eta-reduction", Level: "error", Message: "Avoid wrapping a function call that only forwards its argument. Eta-reduce this arrow to the function value itself (pass f instead of (x) => f(x)). If the callee is already partially applied, use that partial directly. Do not nest calls.", FilePath: "violation.ts", Line: 2, Column: 24},
	})
}
