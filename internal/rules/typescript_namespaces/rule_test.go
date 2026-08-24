package typescript_namespaces

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", TypescriptNamespacesRule, []analysis.Violation{
		{RuleName: "typescript-namespaces", Level: "error", Message: "Avoid TypeScript namespaces for Effect module organization. Export an ES module namespace projection or named values instead.", FilePath: "violation.ts", Line: 1, Column: 11},
	})
}
