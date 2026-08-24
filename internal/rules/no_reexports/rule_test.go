package no_reexports

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-reexports", Level: "error", Message: "Do not re-export imported bindings. Import the dependency where it is used and expose a locally defined public interface instead.", FilePath: "index.ts", Line: 1, Column: 10},
	})
}
