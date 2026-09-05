package scoped_client_cache

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", ScopedClientCacheRule, []analysis.Violation{
		{RuleName: "scoped-client-cache", Level: "error", Message: "Do not acquire a scoped resource inside an ordinary Cache lookup. Acquire the resource in its owning layer and let lookup use the shared client.", FilePath: "violation.ts", Line: 9, Column: 5},
		{RuleName: "scoped-client-cache", Level: "error", Message: "Do not acquire a scoped resource inside an ordinary Cache lookup. Acquire the resource in its owning layer and let lookup use the shared client.", FilePath: "violation.ts", Line: 13, Column: 20},
		{RuleName: "scoped-client-cache", Level: "error", Message: "Do not acquire a scoped resource inside an ordinary Cache lookup. Acquire the resource in its owning layer and let lookup use the shared client.", FilePath: "violation.ts", Line: 19, Column: 19},
	})
}
