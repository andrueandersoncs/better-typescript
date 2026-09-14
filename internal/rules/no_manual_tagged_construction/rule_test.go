package no_manual_tagged_construction

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-manual-tagged-construction", Level: "error", Message: "Use the existing Schema tagged `.make`, tagged class/error constructor, or Data.taggedEnum variant constructor. Do not construct a tagged value by writing a literal `_tag` object.", FilePath: "cases.ts", Line: 2, Column: 19},
	})
}
