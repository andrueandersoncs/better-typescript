package no_property_access_after_call

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-property-access-after-call", Level: "error", Message: "Avoid accessing a property directly after a function call. Store the call result in a const before accessing its property. Chained function calls are allowed.", FilePath: "src/violation.ts", Line: 2, Column: 40},
	})
}
