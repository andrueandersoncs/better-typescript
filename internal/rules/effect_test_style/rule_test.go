package effect_test_style

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "effect-test-style", Level: "error", Message: "Use it.effect for Effect tests. Effect-aware tests provide the correct runtime and deterministic services.", FilePath: "index.ts", Line: 3, Column: 1},
	})
}
