package cache_per_request

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "cache-per-request", Level: "error", Message: "Construct Cache once in its owning layer or scope, not per request. Create the cache during layer acquisition and close over the shared handle.", FilePath: "index.ts", Line: 2, Column: 44},
	})
}
