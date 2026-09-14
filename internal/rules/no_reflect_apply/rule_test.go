package no_reflect_apply

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-reflect-apply", Level: "error", Message: "Replace `Reflect.apply` with a typed function call. Model dynamic dispatch behind a named interface.", FilePath: "cases.ts", Line: 4, Column: 1},
	})
}
