package require_export_jsdoc

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

const expectedMessage = `Exports need multi-line JSDoc with non-empty "Use when:" and "Example:" sections. Check from first principles whether the export and declaration are needed. Remove either when it is not needed. Otherwise, add the required sections directly above the export; separate them with blank lines. Both sections may span multiple lines.`

func expectedViolation(filePath string, line int) analysis.Violation {
	return analysis.Violation{RuleName: "require-export-jsdoc", Level: "error", Message: expectedMessage, FilePath: filePath, Line: line, Column: 1}
}

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		expectedViolation("export_equals.cts", 2),
		expectedViolation("observed.ts", 2),
		expectedViolation("observed.ts", 5),
		expectedViolation("observed.ts", 8),
		expectedViolation("observed.ts", 11),
		expectedViolation("observed.ts", 14),
		expectedViolation("violation.ts", 1),
		expectedViolation("violation.ts", 4),
		expectedViolation("violation.ts", 11),
		expectedViolation("violation.ts", 20),
		expectedViolation("violation.ts", 29),
		expectedViolation("violation.ts", 38),
		expectedViolation("violation.ts", 47),
		expectedViolation("violation.ts", 55),
		expectedViolation("violation.ts", 59),
		expectedViolation("violation.ts", 60),
		expectedViolation("violation.ts", 61),
		expectedViolation("violation.ts", 62),
		expectedViolation("violation.ts", 63),
	})
}
