package require_safety_comment_for_type_assertion

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-safety-comment-for-type-assertion", Level: "error", Message: "This type assertion has no `SAFETY:` justification. State the checked invariant immediately before the assertion or its containing statement, and explain it using `because`.", FilePath: "cases.ts", Line: 2, Column: 17},
		{RuleName: "require-safety-comment-for-type-assertion", Level: "error", Message: "This type assertion has no `SAFETY:` justification. State the checked invariant immediately before the assertion or its containing statement, and explain it using `because`.", FilePath: "cases.ts", Line: 15, Column: 20},
		{RuleName: "require-safety-comment-for-type-assertion", Level: "error", Message: "This type assertion has no `SAFETY:` justification. State the checked invariant immediately before the assertion or its containing statement, and explain it using `because`.", FilePath: "cases.ts", Line: 16, Column: 96},
	})
}
