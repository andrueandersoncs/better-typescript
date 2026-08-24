package no_trivial_effect_fn

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-trivial-effect-fn", Level: "error", Message: "Avoid named Effect.fn wrappers that only forward their parameters. Export the forwarded Effect operation directly. Keep Effect.fn only when the named workflow transforms, recovers, sequences, or otherwise adds behavior.", FilePath: "index.ts", Line: 3, Column: 14},
	})
}
