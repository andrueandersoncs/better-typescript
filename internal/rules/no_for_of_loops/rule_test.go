package no_for_of_loops

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoForOfLoopsRule, []analysis.Violation{
		{RuleName: "no-for-of-loops", Level: "error", Message: "Avoid imperative logic in for..of loops. Use Effect's Array module, such as Array.map(), Array.reduce(), Array.filter(), or Array.flatMap(), instead.", FilePath: "src/violation.ts", Line: 1, Column: 62},
	})
}
