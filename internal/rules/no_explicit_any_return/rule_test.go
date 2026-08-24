package no_explicit_any_return

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoExplicitAnyReturnRule, []analysis.Violation{
		{RuleName: "no-explicit-any-return", Level: "error", Message: "Avoid function return types that include any. Declare a precise return type instead of any. If the value is unknown at a boundary, use unknown and narrow before use.", FilePath: "src/violation.ts", Line: 1, Column: 1},
	})
}
