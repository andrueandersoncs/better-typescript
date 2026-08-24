package prefer_inferred_types

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferInferredTypesRule, []analysis.Violation{
		{RuleName: "prefer-inferred-types", Level: "error", Message: "Avoid a const annotation when its initializer infers the same type. Delete the type annotation. Keep annotations that widen a value or guide generic inference.", FilePath: "violation.ts", Line: 2, Column: 22},
	})
}
