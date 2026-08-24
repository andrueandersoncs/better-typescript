package no_monomorphic_struct_get

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-monomorphic-struct-get", Level: "error", Message: "Avoid monomorphizing Struct.get at its declaration. Keep Struct.get polymorphic. Inline it at a typed consumer, or put the domain type on the consuming value or result rather than on the getter.", FilePath: "src/cases.ts", Line: 3, Column: 17},
	})
}
