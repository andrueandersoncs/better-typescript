package boundary_schema_decode

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "boundary-schema-decode", Level: "error", Message: "Decode unknown boundary data. Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value.", FilePath: "index.ts", Line: 2, Column: 37},
	})
}
