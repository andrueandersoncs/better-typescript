package prefer_layer_unwrap

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferLayerUnwrapRule, []analysis.Violation{
		{RuleName: "prefer-layer-unwrap", Level: "error", Message: "Flatten an Effect that produces a Layer with Layer.unwrap. Replace the manual Layer.effect and Layer.flatMap bridge with Layer.unwrap(effect).", FilePath: "violation.ts", Line: 4, Column: 22},
	})
}
