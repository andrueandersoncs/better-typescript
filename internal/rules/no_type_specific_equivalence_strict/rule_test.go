package no_type_specific_equivalence_strict

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-type-specific-equivalence-strict", Level: "error", Message: "Avoid families of primitive-specific Equivalence.strictEqual bindings. Compare at the use site or expose one generic comparison operation. A single semantically named binding is allowed.", FilePath: "src/violation.ts", Line: 4, Column: 7},
	})
}
