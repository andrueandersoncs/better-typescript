package test_clock_for_time

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", TestClockForTimeRule, []analysis.Violation{
		{RuleName: "test-clock-for-time", Level: "error", Message: "Do not sleep before advancing TestClock in the same fiber. Fork the positive sleep, then advance TestClock and join or interrupt the fiber.", FilePath: "violation.ts", Line: 6, Column: 10},
		{RuleName: "test-clock-for-time", Level: "error", Message: "Do not sleep before advancing TestClock in the same fiber. Fork the positive sleep, then advance TestClock and join or interrupt the fiber.", FilePath: "violation.ts", Line: 11, Column: 10},
		{RuleName: "test-clock-for-time", Level: "error", Message: "Do not sleep before advancing TestClock in the same fiber. Fork the positive sleep, then advance TestClock and join or interrupt the fiber.", FilePath: "violation.ts", Line: 17, Column: 10},
	})
}
