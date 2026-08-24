package prefer_effect_fn

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-fn", Level: "error", Message: "Avoid wrapping the body of load in Effect.gen; use Effect.fn. Use Effect.fn for the outer function and move the generator body out of Effect.gen. Preserve any self/this binding on the Effect.fn call.", FilePath: "violation.ts", Line: 2, Column: 7},
	})
}
