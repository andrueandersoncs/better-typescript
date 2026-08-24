package no_unsafe_effect_apis

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-unsafe-effect-apis", Level: "error", Message: "Avoid unsafe Effect APIs. Use the safe Effect API and handle its Effect, Option, Result, or identity semantics explicitly. If no safe counterpart preserves the required behavior, redesign the boundary instead of using an API whose name contains unsafe.", FilePath: "index.ts", Line: 2, Column: 20},
	})
}
