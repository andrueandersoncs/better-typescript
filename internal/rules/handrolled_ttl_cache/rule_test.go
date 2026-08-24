package handrolled_ttl_cache

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "handrolled-ttl-cache", Level: "error", Message: "Avoid a hand-rolled TTL Map cache when Effect Cache fits. Use Cache.make or Cache.makeWith when its lifecycle and eviction semantics fit.", FilePath: "index.ts", Line: 1, Column: 19},
	})
}
