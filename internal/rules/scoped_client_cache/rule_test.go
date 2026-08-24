package scoped_client_cache

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", ScopedClientCacheRule, []analysis.Violation{
		{RuleName: "scoped-client-cache", Level: "error", Message: "Acquire clients outside Cache lookup functions and share them through a layer. Build the client once in the owning layer, then make lookup a plain call.", FilePath: "violation.ts", Line: 3, Column: 91},
	})
}
