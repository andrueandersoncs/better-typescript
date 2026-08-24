package require_predicate_name_consistency

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-predicate-name-consistency", Level: "error", Message: "isUser claims a predicate, but its result shape is object. Rename the function so its operation matches the non-boolean result, or return a boolean or type-predicate result.", FilePath: "index.ts", Line: 2, Column: 7},
	})
}
