package schema_error_class

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", SchemaErrorClassRule, []analysis.Violation{
		{RuleName: "schema-error-class", Level: "error", Message: "Use Schema.TaggedErrorClass for typed Effect errors. Map boundary failures into a tagged schema error with useful operation context.", FilePath: "violation.ts", Line: 1, Column: 7},
	})
}
