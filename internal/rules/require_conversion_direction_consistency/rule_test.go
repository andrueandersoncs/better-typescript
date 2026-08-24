package require_conversion_direction_consistency

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-conversion-direction-consistency", Level: "error", Message: "parseUser names its conversion result as user, but it returns order. Rename the result phrase to order, or return a value whose concept is user.", FilePath: "index.ts", Line: 3, Column: 7},
	})
}
