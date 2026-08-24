package require_callable_role_name_consistency

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-callable-role-name-consistency", Level: "error", Message: "activePredicate claims the predicate role, but does not provide a boolean or type-predicate result. Rename away from the predicate role noun, or change the signature and body so the predicate contract holds.", FilePath: "index.ts", Line: 1, Column: 7},
	})
}
