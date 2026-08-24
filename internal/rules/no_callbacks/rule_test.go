package no_callbacks

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoCallbacksRule, []analysis.Violation{
		{RuleName: "no-callbacks", Level: "error", Message: "Avoid callback-style void APIs. Return an Effect from the operation instead of accepting a callback.", FilePath: "src/violation.ts", Line: 2, Column: 1},
	})
}
