package no_known_value_widening

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-known-value-widening", Level: "error", Message: "The explicit unknown type on binding `value` discards known type evidence. Keep inference, validate with `satisfies`, or use a named owner contract.", FilePath: "cases.ts", Line: 3, Column: 24},
		{RuleName: "no-known-value-widening", Level: "error", Message: "The explicit open dictionary type on binding `commands` discards known type evidence. Keep inference, validate with `satisfies`, or use a named owner contract.", FilePath: "cases.ts", Line: 4, Column: 43},
		{RuleName: "no-known-value-widening", Level: "error", Message: "The explicit unknown type on argument for parameter `input` of `isString` discards known type evidence. Keep inference, validate with `satisfies`, or use a named owner contract.", FilePath: "cases.ts", Line: 7, Column: 10},
		{RuleName: "no-known-value-widening", Level: "error", Message: "The explicit open dictionary type on binding `keyed` discards known type evidence. Keep inference, validate with `satisfies`, or use a named owner contract.", FilePath: "cases.ts", Line: 14, Column: 36},
		{RuleName: "no-known-value-widening", Level: "error", Message: "The explicit open dictionary type on binding `mapped` discards known type evidence. Keep inference, validate with `satisfies`, or use a named owner contract.", FilePath: "cases.ts", Line: 15, Column: 42},
		{RuleName: "no-known-value-widening", Level: "error", Message: "The explicit unknown type on argument for parameter `candidate` of `anonymous function` discards known type evidence. Keep inference, validate with `satisfies`, or use a named owner contract.", FilePath: "cases.ts", Line: 18, Column: 54},
		{RuleName: "no-known-value-widening", Level: "error", Message: "The explicit unknown type on binding `regexValue` discards known type evidence. Keep inference, validate with `satisfies`, or use a named owner contract.", FilePath: "cases.ts", Line: 19, Column: 29},
		{RuleName: "no-known-value-widening", Level: "error", Message: "The explicit unknown type on binding `forwarded` discards known type evidence. Keep inference, validate with `satisfies`, or use a named owner contract.", FilePath: "cases.ts", Line: 22, Column: 37},
		{RuleName: "no-known-value-widening", Level: "error", Message: "The explicit unknown type on binding `parenthesizedForward` discards known type evidence. Keep inference, validate with `satisfies`, or use a named owner contract.", FilePath: "cases.ts", Line: 34, Column: 61},
	})
}
