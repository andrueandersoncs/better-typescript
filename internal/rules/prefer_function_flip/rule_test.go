package prefer_function_flip

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferFunctionFlipRule, []analysis.Violation{
		{RuleName: "prefer-function-flip", Level: "error", Message: "Avoid lambdas that only flip the order of a curried application. Reorder the curried parameters so the fixed argument comes first (data-last), then pass the partial f(y) directly — or use Function.flip(f)(y) instead of (x) => f(x)(y).", FilePath: "violation.ts", Line: 3, Column: 24},
	})
}
