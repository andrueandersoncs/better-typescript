package no_blank_lines_between_single_line_declarations

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoBlankLinesBetweenSingleLineDeclarationsRule, []analysis.Violation{
		{RuleName: "no-blank-lines-between-single-line-declarations", Level: "error", Message: "Single-line declarations of the same kind must not have blank lines between them. Remove the empty line between these adjacent same-kind single-line declarations so they stay contiguous. Keep separators between different statement kinds and around multi-line statements.", FilePath: "src/violation.ts", Line: 4, Column: 3},
	})
}
