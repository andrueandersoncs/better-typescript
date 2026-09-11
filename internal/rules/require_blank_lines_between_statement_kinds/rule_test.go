package require_blank_lines_between_statement_kinds

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	const message = "Different statement kinds must have a blank line between them. Insert an empty line before this statement. Keep adjacent single-line statements together only when they have the same syntax kind."
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "crlf.ts", Line: 2, Column: 1},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "scopes.ts", Line: 3, Column: 3},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "scopes.ts", Line: 9, Column: 5},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "scopes.ts", Line: 15, Column: 7},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "scopes.ts", Line: 18, Column: 7},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "violation.ts", Line: 4, Column: 1},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "violation.ts", Line: 5, Column: 1},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "violation.ts", Line: 9, Column: 3},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "violation.ts", Line: 11, Column: 3},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "violation.ts", Line: 12, Column: 3},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "violation.ts", Line: 17, Column: 1},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "violation.ts", Line: 19, Column: 21},
		{RuleName: "require-blank-lines-between-statement-kinds", Level: "error", Message: message, FilePath: "violation.ts", Line: 22, Column: 1},
	})
}
