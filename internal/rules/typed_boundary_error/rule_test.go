package typed_boundary_error

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", TypedBoundaryErrorRule, []analysis.Violation{
		{RuleName: "typed-boundary-error", Level: "error", Message: "Map boundary failures to typed domain errors. Translate infrastructure failures at the adapter seam into an operation-labelled domain error.", FilePath: "violation.ts", Line: 3, Column: 1},
	})
}
