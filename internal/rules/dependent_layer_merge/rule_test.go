package dependent_layer_merge

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "dependent-layer-merge", Level: "error", Message: "Compose dependent layers with Layer.provide or Layer.provideMerge, not Layer.merge. Use Layer.provide to hide dependency services, or Layer.provideMerge to keep them exposed; reserve merge and mergeAll for independent layers.", FilePath: "index.ts", Line: 9, Column: 1},
	})
}
