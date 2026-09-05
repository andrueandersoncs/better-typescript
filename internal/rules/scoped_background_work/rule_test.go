package scoped_background_work

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", ScopedBackgroundWorkRule, []analysis.Violation{
		{RuleName: "scoped-background-work", Level: "error", Message: "Scope detached background work. Fork detached work into a scope or retain it at an explicit owner.", FilePath: "violation.ts", Line: 2, Column: 17},
		{RuleName: "scoped-background-work", Level: "error", Message: "Scope detached background work. Fork detached work into a scope or retain it at an explicit owner.", FilePath: "violation.ts", Line: 4, Column: 10},
		{RuleName: "scoped-background-work", Level: "error", Message: "Scope detached background work. Fork detached work into a scope or retain it at an explicit owner.", FilePath: "violation.ts", Line: 7, Column: 10},
		{RuleName: "scoped-background-work", Level: "error", Message: "Scope detached background work. Fork detached work into a scope or retain it at an explicit owner.", FilePath: "violation.ts", Line: 10, Column: 24},
		{RuleName: "scoped-background-work", Level: "error", Message: "Scope detached background work. Fork detached work into a scope or retain it at an explicit owner.", FilePath: "violation.ts", Line: 14, Column: 24},
	})
}
