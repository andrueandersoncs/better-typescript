package require_blank_lines_around_multiline_declarations

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-blank-lines-around-multiline-declarations", Level: "error", Message: "Multi-line declarations must have a blank line above and below. Insert an empty line before and after this declaration so its multi-line shape is visually separated from neighboring statements. Single-line declarations do not need surrounding blank lines; the first and last statements in a block are exempt on the outer sides.", FilePath: "index.ts", Line: 2, Column: 1},
	})
}
