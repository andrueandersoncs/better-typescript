package no_instanceof

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-instanceof", Level: "error", Message: "Avoid instanceof for the first-party class \"Local\". Use a stable discriminant, an explicit structural type guard, or Schema.is with a structurally defined Schema such as Schema.Struct. Schema.is on Schema.Class retains constructor semantics, so it does not make a class check structural or cross-realm safe.", FilePath: "src/cases.ts", Line: 3, Column: 5},
	})
}
