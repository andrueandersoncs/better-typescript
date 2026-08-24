package no_mutable_array_methods

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-mutable-array-methods", Level: "error", Message: "Avoid mutating arrays with Array.prototype.push(). This is a sign that you're doing something fundamentally procedural when you should be taking a more functional approach. Use Effect's Array module, such as Array.append(), Array.map(), Array.filter(), Array.sort(), or spread syntax instead of manipulating an array in place.", FilePath: "src/cases.ts", Line: 2, Column: 1},
	})
}
