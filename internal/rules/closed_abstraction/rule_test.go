package closed_abstraction

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "closed-abstraction", Level: "error", Message: "LoadData and load form a closed abstraction with at most one external owner. Collapse the function and its private data vocabulary into their external owner, reuse an existing concept, or deepen the Module until the abstraction has independent leverage. Do not replace the named model with an anonymous object type.", FilePath: "index.ts", Line: 1, Column: 11},
	})
}
