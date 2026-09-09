package require_blank_lines_around_multiline_statements

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-blank-lines-around-multiline-statements", Level: "error", Message: "Multi-line statements must have a blank line above and below. Insert an empty line before and after this statement so its multi-line shape is visually separated from neighboring statements. Single-line statements do not need surrounding blank lines; the first and last statements in a statement list are exempt on the outer sides.", FilePath: "index.ts", Line: 3, Column: 3},
		{RuleName: "require-blank-lines-around-multiline-statements", Level: "error", Message: "Multi-line statements must have a blank line above and below. Insert an empty line before and after this statement so its multi-line shape is visually separated from neighboring statements. Single-line statements do not need surrounding blank lines; the first and last statements in a statement list are exempt on the outer sides.", FilePath: "index.ts", Line: 13, Column: 3},
		{RuleName: "require-blank-lines-around-multiline-statements", Level: "error", Message: "Multi-line statements must have a blank line above and below. Insert an empty line before and after this statement so its multi-line shape is visually separated from neighboring statements. Single-line statements do not need surrounding blank lines; the first and last statements in a statement list are exempt on the outer sides.", FilePath: "index.ts", Line: 21, Column: 3},
		{RuleName: "require-blank-lines-around-multiline-statements", Level: "error", Message: "Multi-line statements must have a blank line above and below. Insert an empty line before and after this statement so its multi-line shape is visually separated from neighboring statements. Single-line statements do not need surrounding blank lines; the first and last statements in a statement list are exempt on the outer sides.", FilePath: "index.ts", Line: 31, Column: 3},
		{RuleName: "require-blank-lines-around-multiline-statements", Level: "error", Message: "Multi-line statements must have a blank line above and below. Insert an empty line before and after this statement so its multi-line shape is visually separated from neighboring statements. Single-line statements do not need surrounding blank lines; the first and last statements in a statement list are exempt on the outer sides.", FilePath: "index.ts", Line: 69, Column: 3},
	})
}
