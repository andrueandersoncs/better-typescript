package service_method_effect_fn

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", ServiceMethodEffectFnRule, []analysis.Violation{
		{RuleName: "service-method-effect-fn", Level: "error", Message: "Wrap public Effect service operations with a named Effect.fn. Name the operation Domain.operation and keep the generator body focused on its workflow.", FilePath: "violation.ts", Line: 2, Column: 14},
	})
}
