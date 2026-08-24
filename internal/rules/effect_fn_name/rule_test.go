package effect_fn_name

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "effect-fn-name", Level: "error", Message: "Use a non-empty domain-qualified Effect.fn name. Use a stable name such as UserRepo.get for tracing and spans.", FilePath: "index.ts", Line: 2, Column: 11},
	})
}
