package valid_effect_dual_arity

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "valid-effect-dual-arity", Level: "error", Message: "Effect Function.dual does not support numeric arity 0 or 1. Use a plain unary function, or use Function.dual with a supported arity or predicate dispatch.", FilePath: "index.ts", Line: 4, Column: 25},
		{RuleName: "valid-effect-dual-arity", Level: "error", Message: "Effect Function.dual does not support numeric arity 0 or 1. Use a plain unary function, or use Function.dual with a supported arity or predicate dispatch.", FilePath: "index.ts", Line: 5, Column: 27},
	})
}
