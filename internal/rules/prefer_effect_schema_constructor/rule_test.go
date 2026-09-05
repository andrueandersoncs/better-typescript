package prefer_effect_schema_constructor

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-schema-constructor", Level: "error", Message: "Avoid constructing an Effect Schema class with new. Call the same class's static make method instead: SomeSchema.make(...).", FilePath: "schema-class-violation.ts", Line: 5, Column: 19},
		{RuleName: "prefer-effect-schema-constructor", Level: "error", Message: "Avoid declaring or returning a raw object literal. Reuse an existing Effect Schema whose semantics match this result and construct it through schema.make. If none exists, reconsider whether this function is a real abstraction or a procedural seam that should be collapsed into its owner. For data with independent meaning, define a Schema.Struct with a Schema-suffixed const and a decoded interface named without the suffix.", FilePath: "violation.ts", Line: 1, Column: 30},
	})
}
