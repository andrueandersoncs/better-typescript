package no_mutable_array_methods

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-mutable-array-methods", Level: "error", Message: "Avoid mutating arrays with Array.prototype.push(). Application code should use Effect's Array module, non-mutating array methods, or spread syntax instead of manipulating an array in place. An owned library kernel may use a local mutable builder only under explicit project policy; this rule does not infer that exception.", FilePath: "src/cases.ts", Line: 2, Column: 1},
	})
}
