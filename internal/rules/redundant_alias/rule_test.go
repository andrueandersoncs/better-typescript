package redundant_alias

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "redundant-alias", Level: "error", Message: "CustomerData renames Customer without adding independent semantics. Use Customer directly, merge the concepts, or add a real invariant or independently evolving boundary. Do not keep a second name only to describe structural use.", FilePath: "index.ts", Line: 2, Column: 6},
	})
}
