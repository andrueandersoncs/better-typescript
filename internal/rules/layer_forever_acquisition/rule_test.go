package layer_forever_acquisition

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", LayerForeverAcquisitionRule, []analysis.Violation{
		{RuleName: "layer-forever-acquisition", Level: "error", Message: "Fork long-lived work into the layer scope so acquisition completes. Run the worker with Effect.forkScoped, FiberSet, or FiberMap.", FilePath: "src/violation.ts", Line: 2, Column: 23},
	})
}
