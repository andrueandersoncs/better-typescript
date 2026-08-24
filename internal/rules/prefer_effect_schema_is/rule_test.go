package prefer_effect_schema_is

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-schema-is", Level: "error", Message: "Avoid checking state._tag === \"Started\" directly. Replace the tag check with Schema.is($schema)(state), using the Effect Schema class for \"Started\".", FilePath: "violation.ts", Line: 3, Column: 16},
	})
}
