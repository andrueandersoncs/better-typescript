package cache_preference

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "cache-preference", Level: "error", Message: "Prefer Effect Cache when its lifecycle semantics fit. Use Cache.make or Cache.makeWith instead of a hand-rolled cache.", FilePath: "index.ts", Line: 1, Column: 23},
	})
}
