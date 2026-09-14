package no_manual_tag_comparison

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-manual-tag-comparison", Level: "error", Message: "Use Match.tag or Match.tags for tagged-value branching. Use Predicate.isTagged for a simple reusable predicate.", FilePath: "cases.ts", Line: 2, Column: 1},
		{RuleName: "no-manual-tag-comparison", Level: "error", Message: "Do not switch on `_tag`. Use Match.value(value).pipe(Match.tag, Match.tags, or Match.tagsExhaustive), or use the tagged enum `$match` helper.", FilePath: "cases.ts", Line: 3, Column: 1},
	})
}
