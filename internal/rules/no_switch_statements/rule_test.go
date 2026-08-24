package no_switch_statements

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-switch-statements", Level: "error", Message: "Avoid switch statements. Use Effect's Match module for pattern matching, and prefer Match.exhaustive so every case is handled explicitly.", FilePath: "index.ts", Line: 1, Column: 38},
	})
}
