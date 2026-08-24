package require_because_in_comments

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-because-in-comments", Level: "error", Message: "Comments must explain why using the word \"because\". Delete the comment if it does not explain a reason.", FilePath: "index.ts", Line: 1, Column: 1},
	})
}
