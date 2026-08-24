package prefer_direct_boolean_return

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-direct-boolean-return", Level: "error", Message: "Avoid returning true from a conditional branch. Use the condition as the boolean value instead: return (condition).", FilePath: "violation.ts", Line: 2, Column: 16},
	})
}
