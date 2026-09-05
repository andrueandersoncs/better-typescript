package cache_preference

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "cache-preference", Level: "error", Message: "Prefer Effect Cache for a hand-rolled value-cache protocol when its lifecycle fits. Use Cache.make or Cache.makeWith after choosing key equality, ownership, failure, and retention semantics.", FilePath: "index.ts", Line: 1, Column: 16},
	})
}
