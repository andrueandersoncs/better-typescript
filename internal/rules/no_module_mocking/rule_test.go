package no_module_mocking

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-module-mocking", Level: "error", Message: "Replace module mocking with dependency injection through a real interface, service layer, or faithful test implementation. Exercise the production dependency seam instead of replacing a module namespace.", FilePath: "cases.ts", Line: 1, Column: 1},
		{RuleName: "no-module-mocking", Level: "error", Message: "Replace module mocking with dependency injection through a real interface, service layer, or faithful test implementation. Exercise the production dependency seam instead of replacing a module namespace.", FilePath: "imported.ts", Line: 2, Column: 1},
	})
}
