package require_export_jsdoc

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

const expectedMessage = `Exports need structured JSDoc with a "Scope: public" or "Scope: private" section. Private exports must only declare their scope. Public exports also need a concise, specific scenario in the "When to use:" section and a complete, minimal TypeScript code example in a fenced "Example:" section.`

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
		expectedViolation("violation.ts", 13),
		expectedViolation("violation.ts", 20),
		expectedViolation("violation.ts", 29),
		expectedViolation("violation.ts", 41),
		expectedViolation("violation.ts", 53),
		expectedViolation("violation.ts", 68),
		expectedViolation("violation.ts", 79),
		expectedViolation("violation.ts", 92),
		expectedViolation("violation.ts", 106),
		expectedViolation("violation.ts", 120),
		expectedViolation("violation.ts", 124),
		expectedViolation("violation.ts", 125),
		expectedViolation("violation.ts", 126),
		expectedViolation("violation.ts", 127),
		expectedViolation("violation.ts", 128),
	})
}
