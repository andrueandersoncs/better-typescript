package no_blank_lines_between_single_line_declarations

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoBlankLinesBetweenSingleLineDeclarationsRule, []analysis.Violation{
		{RuleName: "no-blank-lines-between-single-line-declarations", Level: "error", Message: "Single-line declarations must not have blank lines between them. Remove the empty line between these adjacent single-line declarations so they stay contiguous. Blank lines remain required around multi-line declarations; keep those separators when a neighbor is multi-line.", FilePath: "src/violation.ts", Line: 4, Column: 3},
	})
}
