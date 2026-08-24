package inflight_dedupe_map

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", InflightDedupeMapRule, []analysis.Violation{
		{RuleName: "inflight-dedupe-map", Level: "error", Message: "Avoid a hand-rolled in-flight deduplication Map when Effect Cache fits. Cache.get shares an in-flight lookup for the same missing key.", FilePath: "src/violation.ts", Line: 1, Column: 6},
	})
}
