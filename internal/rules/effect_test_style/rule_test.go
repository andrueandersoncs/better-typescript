package effect_test_style

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "effect-test-style", Level: "error", Message: "Use it.effect for Effect tests. Effect-aware tests provide the correct runtime and deterministic services.", FilePath: "index.ts", Line: 3, Column: 1},
		{RuleName: "effect-test-style", Level: "error", Message: "Use it.effect.prop for Effect property tests. Effect-aware property tests execute returned Effects with the correct runtime and deterministic services.", FilePath: "index.ts", Line: 4, Column: 1},
		{RuleName: "effect-test-style", Level: "error", Message: "Use it.effect for Effect tests. Effect-aware tests provide the correct runtime and deterministic services.", FilePath: "index.ts", Line: 7, Column: 1},
		{RuleName: "effect-test-style", Level: "error", Message: "Use it.effect.prop for Effect property tests. Effect-aware property tests execute returned Effects with the correct runtime and deterministic services.", FilePath: "index.ts", Line: 9, Column: 1},
		{RuleName: "effect-test-style", Level: "error", Message: "Use it.effect for Effect tests. Effect-aware tests provide the correct runtime and deterministic services.", FilePath: "index.ts", Line: 15, Column: 1},
	})
}
