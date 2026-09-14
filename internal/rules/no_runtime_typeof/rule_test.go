package no_runtime_typeof

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-runtime-typeof", Level: "error", Message: "A `typeof` check narrows a representation without establishing its contract. Parse input at its I/O boundary, then branch on the domain value.", FilePath: "cases.ts", Line: 2, Column: 5},
	})
}
