package no_manual_tagged_union

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-manual-tagged-union", Level: "error", Message: "Avoid manually declaring a union of literal `_tag` object variants. Use Data.TaggedEnum for internal workflow decisions or state. For reusable boundary data, define Schema.TaggedStruct variants and compose them with Schema.TaggedUnion.", FilePath: "cases.ts", Line: 1, Column: 6},
		{RuleName: "no-manual-tagged-union", Level: "error", Message: "Avoid manually declaring a union of literal `_tag` object variants. Use Data.TaggedEnum for internal workflow decisions or state. For reusable boundary data, define Schema.TaggedStruct variants and compose them with Schema.TaggedUnion.", FilePath: "cases.ts", Line: 5, Column: 6},
		{RuleName: "no-manual-tagged-union", Level: "error", Message: "Avoid manually declaring a union of literal `_tag` object variants. Use Data.TaggedEnum for internal workflow decisions or state. For reusable boundary data, define Schema.TaggedStruct variants and compose them with Schema.TaggedUnion.", FilePath: "cases.ts", Line: 9, Column: 6},
	})
}
