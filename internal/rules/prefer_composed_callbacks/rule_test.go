package prefer_composed_callbacks

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-composed-callbacks", Level: "error", Message: "Avoid inline callbacks that compose the callback parameter through calls. Use flow or pipe when the parameter moves through a composition. When no combinator expresses the transformation, name the adapter in the nearest scope and pass it by reference.", FilePath: "index.ts", Line: 3, Column: 31},
	})
}
