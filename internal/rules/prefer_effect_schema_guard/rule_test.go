package prefer_effect_schema_guard

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-schema-guard", Level: "error", Message: "Avoid using \"name\" in value as a type guard. Define an Effect Schema for this value and replace the check with Schema.is($schema)(value).", FilePath: "violation.ts", Line: 2, Column: 5},
	})
}
