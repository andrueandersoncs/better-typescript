package no_nested_calls

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-nested-calls", Level: "error", Message: "Avoid computing inner inline in the arguments of outer. A call whose result feeds another call hides a sequence of steps in one expression that reads inside-out. Declare the inner result as a const (or a yield* step in a gen block) and pass the name, or restructure data-last so the value flows through pipe. Calls that return functions stay inline: currying and pipe stages read left-to-right.", FilePath: "src/cases.ts", Line: 3, Column: 25},
	})
}
