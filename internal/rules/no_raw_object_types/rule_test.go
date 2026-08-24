package no_raw_object_types

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-raw-object-types", Level: "error", Message: "Parameter uses an anonymous object type instead of a named type. Reuse a named data structure that already expresses this value's semantics. If none exists, reconsider whether this function is a real abstraction or a procedural seam that should be collapsed into its owner. Introduce a new model only when the data has meaning independent of this parameter list; never replace it with another anonymous object type.", FilePath: "src/cases.ts", Line: 2, Column: 20},
	})
}
