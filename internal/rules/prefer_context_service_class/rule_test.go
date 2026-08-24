package prefer_context_service_class

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-context-service-class", Level: "error", Message: "Prefer a class extending Context.Service for service definitions. Pass the service interface as the Shape type parameter.", FilePath: "violation.ts", Line: 2, Column: 18},
	})
}
