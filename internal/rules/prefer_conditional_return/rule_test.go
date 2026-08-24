package prefer_conditional_return

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-conditional-return", Level: "error", Message: "Avoid if statements that only choose between two return values. Return a conditional expression instead: return (condition) ? \"yes\" : \"no\".", FilePath: "index.ts", Line: 1, Column: 43},
	})
}
