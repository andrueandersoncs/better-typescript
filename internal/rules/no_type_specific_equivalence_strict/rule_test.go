package no_type_specific_equivalence_strict

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-type-specific-equivalence-strict", Level: "error", Message: "Avoid primitive-specific Equivalence.strictEqual bindings. Call Equivalence.strictEqual at the comparison site instead.", FilePath: "src/violation.ts", Line: 4, Column: 7},
		{RuleName: "no-type-specific-equivalence-strict", Level: "error", Message: "Avoid primitive-specific Equivalence.strictEqual bindings. Call Equivalence.strictEqual at the comparison site instead.", FilePath: "src/violation.ts", Line: 5, Column: 7},
	})
}
