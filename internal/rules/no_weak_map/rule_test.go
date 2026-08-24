package no_weak_map

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-weak-map", Level: "error", Message: "Avoid WeakMap because it keeps mutable state outside Effect. Store immutable state in an Effect Ref instead. Use SynchronizedRef when updates are effectful, or SubscriptionRef when consumers need a stream of changes. Create the reference inside an Effect or Layer instead of retaining a module-level WeakMap.", FilePath: "index.ts", Line: 1, Column: 24},
	})
}
