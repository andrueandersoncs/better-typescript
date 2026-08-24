package no_value_aliases

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-value-aliases", Level: "error", Message: "Do not declare aliases for existing values. Use the referenced value directly. If it needs distinct semantics or one-time evaluation, introduce behavior or constructed data instead of another name for the same value.", FilePath: "index.ts", Line: 2, Column: 14},
	})
}
