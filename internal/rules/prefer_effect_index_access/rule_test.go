package prefer_effect_index_access

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-index-access", Level: "error", Message: "Avoid direct array and tuple index access. Use Array.get(collection, index) to represent a potentially absent array element, or Array.headNonEmpty when a collection is proven non-empty. For a fixed-length tuple, use Tuple.get(tuple, index) to preserve its positional type.", FilePath: "violation.ts", Line: 2, Column: 15},
	})
}
