package boundary_schema_decode

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "boundary-schema-decode", Level: "error", Message: "Decode unknown boundary data. Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value.", FilePath: "index.ts", Line: 11, Column: 24},
		{RuleName: "boundary-schema-decode", Level: "error", Message: "Decode unknown boundary data. Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value.", FilePath: "index.ts", Line: 14, Column: 33},
		{RuleName: "boundary-schema-decode", Level: "error", Message: "Decode unknown boundary data. Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value.", FilePath: "index.ts", Line: 20, Column: 33},
		{RuleName: "boundary-schema-decode", Level: "error", Message: "Decode unknown boundary data. Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value.", FilePath: "index.ts", Line: 30, Column: 15},
		{RuleName: "boundary-schema-decode", Level: "error", Message: "Decode unknown boundary data. Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value.", FilePath: "index.ts", Line: 54, Column: 10},
		{RuleName: "boundary-schema-decode", Level: "error", Message: "Decode unknown boundary data. Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value.", FilePath: "semantics.ts", Line: 7, Column: 48},
	})
}
