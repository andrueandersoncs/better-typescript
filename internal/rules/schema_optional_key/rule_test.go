package schema_optional_key

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", SchemaOptionalKeyRule, []analysis.Violation{
		{RuleName: "schema-optional-key", Level: "error", Message: "Use Schema.optionalKey for absent fields unless undefined is contractual. Use optionalKey for absent JSON keys; reserve optional for explicit undefined.", FilePath: "violation.ts", Line: 3, Column: 40},
	})
}
