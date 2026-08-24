package require_lookup_totality_name_consistency

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-lookup-totality-name-consistency", Level: "error", Message: "findUser claims optional lookup via find, but returns total data. Return optional or fallible data (Option, nullish, Result), or remove find/lookup/maybe/optional from the name.", FilePath: "index.ts", Line: 2, Column: 7},
	})
}
