package require_because_in_comments

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-because-in-comments", Level: "error", Message: "Comments must explain why using the word \"because\". Delete the comment if it does not explain a reason.", FilePath: "index.ts", Line: 1, Column: 1},
		{RuleName: "require-because-in-comments", Level: "error", Message: "Comments must explain why using the word \"because\". Delete the comment if it does not explain a reason.", FilePath: "index.ts", Line: 6, Column: 1},
		{RuleName: "require-because-in-comments", Level: "error", Message: "Comments must explain why using the word \"because\". Delete the comment if it does not explain a reason.", FilePath: "index.ts", Line: 7, Column: 1},
		{RuleName: "require-because-in-comments", Level: "error", Message: "Comments must explain why using the word \"because\". Delete the comment if it does not explain a reason.", FilePath: "index.ts", Line: 8, Column: 1},
		{RuleName: "require-because-in-comments", Level: "error", Message: "Comments must explain why using the word \"because\". Delete the comment if it does not explain a reason.", FilePath: "index.ts", Line: 9, Column: 1},
		{RuleName: "require-because-in-comments", Level: "error", Message: "Comments must explain why using the word \"because\". Delete the comment if it does not explain a reason.", FilePath: "index.ts", Line: 15, Column: 1},
		{RuleName: "require-because-in-comments", Level: "error", Message: "Comments must explain why using the word \"because\". Delete the comment if it does not explain a reason.", FilePath: "index.ts", Line: 19, Column: 1},
	})
}
