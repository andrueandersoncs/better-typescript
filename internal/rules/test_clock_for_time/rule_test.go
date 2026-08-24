package test_clock_for_time

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", TestClockForTimeRule, []analysis.Violation{
		{RuleName: "test-clock-for-time", Level: "error", Message: "Use TestClock for time-sensitive tests. Fork time-dependent work, then advance TestClock instead of real time.", FilePath: "violation.ts", Line: 3, Column: 26},
	})
}
