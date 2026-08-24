package no_for_in_loops

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoForInLoopsRule, []analysis.Violation{
		{RuleName: "no-for-in-loops", Level: "error", Message: "Avoid imperative logic in for..in loops. Use Effect's Record module, such as Record.map(), Record.reduce(), or Record.toEntries(), instead.", FilePath: "src/violation.ts", Line: 1, Column: 61},
	})
}
