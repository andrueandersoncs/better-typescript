package no_chained_type_assertions

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-chained-type-assertions", Level: "error", Message: "This assertion chain discards type evidence. Keep the original precise type, or parse untrusted input at its boundary before narrowing it.", FilePath: "cases.ts", Line: 3, Column: 17},
	})
}
