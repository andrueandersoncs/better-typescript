package test_sleeps

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", TestSleepsRule, []analysis.Violation{
		{RuleName: "test-sleeps", Level: "error", Message: "Avoid Effect.sleep in tests; synchronize deterministically. Use TestClock, Deferred, Queue, Latch, Ref, or an explicit test hook.", FilePath: "violation.ts", Line: 3, Column: 26},
	})
}
