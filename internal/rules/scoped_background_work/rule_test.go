package scoped_background_work

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", ScopedBackgroundWorkRule, []analysis.Violation{
		{RuleName: "scoped-background-work", Level: "error", Message: "Scope background work. Own worker lifetime in a Layer and fork it into that scope.", FilePath: "violation.ts", Line: 2, Column: 16},
	})
}
