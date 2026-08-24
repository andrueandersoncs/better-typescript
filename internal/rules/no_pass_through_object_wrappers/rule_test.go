package no_pass_through_object_wrappers

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-pass-through-object-wrappers", Level: "error", Message: "Avoid a function that only repackages its parameters for another constructor. Inline the constructor or factory call at each caller. Keep a function only when it adds policy, validation, defaults, or behavior.", FilePath: "src/cases.ts", Line: 3, Column: 19},
	})
}
