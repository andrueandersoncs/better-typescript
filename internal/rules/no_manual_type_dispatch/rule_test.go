package no_manual_type_dispatch

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-manual-type-dispatch", Level: "error", Message: "Avoid dispatching on a value with a chain of if statements that each return. This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile error rather than a silent fall-through.", FilePath: "src/cases.ts", Line: 2, Column: 2},
	})
}
