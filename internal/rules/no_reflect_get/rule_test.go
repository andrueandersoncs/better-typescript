package no_reflect_get

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-reflect-get", Level: "error", Message: "Replace `Reflect.get` with typed property access. Parse dynamic input into a named domain type before reading it.", FilePath: "cases.ts", Line: 3, Column: 1},
	})
}
