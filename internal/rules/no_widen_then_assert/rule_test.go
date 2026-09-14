package no_widen_then_assert

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-widen-then-assert", Level: "error", Message: "Binding `widened` discards type evidence and later recreates it with an assertion. Keep the precise type from initialization through use; parse boundary input once.", FilePath: "cases.ts", Line: 3, Column: 16},
		{RuleName: "no-widen-then-assert", Level: "error", Message: "Binding `assertedStored` discards type evidence and later recreates it with an assertion. Keep the precise type from initialization through use; parse boundary input once.", FilePath: "cases.ts", Line: 9, Column: 22},
		{RuleName: "no-widen-then-assert", Level: "error", Message: "Binding `stored` discards type evidence and later recreates it with an assertion. Keep the precise type from initialization through use; parse boundary input once.", FilePath: "cases.ts", Line: 12, Column: 10},
		{RuleName: "no-widen-then-assert", Level: "error", Message: "Binding `broadRecord` discards type evidence and later recreates it with an assertion. Keep the precise type from initialization through use; parse boundary input once.", FilePath: "cases.ts", Line: 18, Column: 24},
		{RuleName: "no-widen-then-assert", Level: "error", Message: "Binding `regexStored` discards type evidence and later recreates it with an assertion. Keep the precise type from initialization through use; parse boundary input once.", FilePath: "cases.ts", Line: 22, Column: 23},
		{RuleName: "no-widen-then-assert", Level: "error", Message: "Binding `annotatedAsserted` discards type evidence and later recreates it with an assertion. Keep the precise type from initialization through use; parse boundary input once.", FilePath: "cases.ts", Line: 30, Column: 27},
		{RuleName: "no-widen-then-assert", Level: "error", Message: "Binding `readonlyStored` discards type evidence and later recreates it with an assertion. Keep the precise type from initialization through use; parse boundary input once.", FilePath: "cases.ts", Line: 32, Column: 26},
	})
}
