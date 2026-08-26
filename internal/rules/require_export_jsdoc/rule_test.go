package require_export_jsdoc

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-export-jsdoc", Level: "error", Message: "Exports need JSDoc that explains when to use them. Check from first principles whether the export and declaration are needed, and verify your assumptions. Remove the export or declaration when they are not needed. Otherwise, add JSDoc directly above the export that explains when to use it.", FilePath: "export_equals.cts", Line: 2, Column: 1},
		{RuleName: "require-export-jsdoc", Level: "error", Message: "Exports need JSDoc that explains when to use them. Check from first principles whether the export and declaration are needed, and verify your assumptions. Remove the export or declaration when they are not needed. Otherwise, add JSDoc directly above the export that explains when to use it.", FilePath: "violation.ts", Line: 1, Column: 1},
		{RuleName: "require-export-jsdoc", Level: "error", Message: "Exports need JSDoc that explains when to use them. Check from first principles whether the export and declaration are needed, and verify your assumptions. Remove the export or declaration when they are not needed. Otherwise, add JSDoc directly above the export that explains when to use it.", FilePath: "violation.ts", Line: 4, Column: 1},
		{RuleName: "require-export-jsdoc", Level: "error", Message: "Exports need JSDoc that explains when to use them. Check from first principles whether the export and declaration are needed, and verify your assumptions. Remove the export or declaration when they are not needed. Otherwise, add JSDoc directly above the export that explains when to use it.", FilePath: "violation.ts", Line: 8, Column: 1},
		{RuleName: "require-export-jsdoc", Level: "error", Message: "Exports need JSDoc that explains when to use them. Check from first principles whether the export and declaration are needed, and verify your assumptions. Remove the export or declaration when they are not needed. Otherwise, add JSDoc directly above the export that explains when to use it.", FilePath: "violation.ts", Line: 9, Column: 1},
		{RuleName: "require-export-jsdoc", Level: "error", Message: "Exports need JSDoc that explains when to use them. Check from first principles whether the export and declaration are needed, and verify your assumptions. Remove the export or declaration when they are not needed. Otherwise, add JSDoc directly above the export that explains when to use it.", FilePath: "violation.ts", Line: 10, Column: 1},
		{RuleName: "require-export-jsdoc", Level: "error", Message: "Exports need JSDoc that explains when to use them. Check from first principles whether the export and declaration are needed, and verify your assumptions. Remove the export or declaration when they are not needed. Otherwise, add JSDoc directly above the export that explains when to use it.", FilePath: "violation.ts", Line: 11, Column: 1},
		{RuleName: "require-export-jsdoc", Level: "error", Message: "Exports need JSDoc that explains when to use them. Check from first principles whether the export and declaration are needed, and verify your assumptions. Remove the export or declaration when they are not needed. Otherwise, add JSDoc directly above the export that explains when to use it.", FilePath: "violation.ts", Line: 12, Column: 1},
	})
}
