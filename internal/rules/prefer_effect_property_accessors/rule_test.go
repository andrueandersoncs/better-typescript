package prefer_effect_property_accessors

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-property-accessors", Level: "error", Message: "Avoid defining getName only to read user.name. Replace this property-access-only function with Struct.get(\"name\") from Effect. Use Struct.get for non-record data types, and Record.get or Record.has for records.", FilePath: "violation.ts", Line: 1, Column: 54},
	})
}
