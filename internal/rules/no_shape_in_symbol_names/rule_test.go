package no_shape_in_symbol_names

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-shape-in-symbol-names", Level: "error", Message: "Rename symbol `PayloadShape` for its domain role. `shape` describes structure rather than ownership.", FilePath: "cases.ts", Line: 1, Column: 6},
		{RuleName: "no-shape-in-symbol-names", Level: "error", Message: "Rename symbol `shape` for its domain role. `shape` describes structure rather than ownership.", FilePath: "cases.ts", Line: 1, Column: 23},
		{RuleName: "no-shape-in-symbol-names", Level: "error", Message: "Rename symbol `shape` for its domain role. `shape` describes structure rather than ownership.", FilePath: "cases.ts", Line: 2, Column: 25},
	})
}
