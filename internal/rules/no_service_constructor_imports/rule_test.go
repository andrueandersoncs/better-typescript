package no_service_constructor_imports

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-service-constructor-imports", Level: "error", Message: "Do not import Effect service constructor `makeIssueService` into runtime code. Import the owning Layer, yield the contextual service, and allow its requirements to propagate to the composition root.", FilePath: "runtime.ts", Line: 1, Column: 10},
	})
}
