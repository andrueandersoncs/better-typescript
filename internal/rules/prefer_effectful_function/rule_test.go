package prefer_effectful_function

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferEffectfulFunctionRule, []analysis.Violation{
		{RuleName: "prefer-effectful-function", Level: "error", Message: "Avoid synchronously unwrapping an Effect in run. Return the Effect from run and compose callers with yield* or Effect.flatMap. Reserve Effect.runSync for the application runtime boundary.", FilePath: "violation.ts", Line: 3, Column: 14},
	})
}
