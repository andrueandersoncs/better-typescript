package test_clock_for_time

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

const fixedWaitMessage = "Do not wait a fixed wall-clock time in tests. Await the event or state change, or drive time with fake timers or TestClock."

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", TestClockForTimeRule, []analysis.Violation{
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "tests/polling.ts", Line: 2, Column: 9},
		{RuleName: "test-clock-for-time", Level: "error", Message: "Do not sleep before advancing TestClock in the same fiber. Fork the positive sleep, then advance TestClock and join or interrupt the fiber.", FilePath: "violation.ts", Line: 6, Column: 10},
		{RuleName: "test-clock-for-time", Level: "error", Message: "Do not sleep before advancing TestClock in the same fiber. Fork the positive sleep, then advance TestClock and join or interrupt the fiber.", FilePath: "violation.ts", Line: 11, Column: 10},
		{RuleName: "test-clock-for-time", Level: "error", Message: "Do not sleep before advancing TestClock in the same fiber. Fork the positive sleep, then advance TestClock and join or interrupt the fiber.", FilePath: "violation.ts", Line: 17, Column: 10},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 17, Column: 9},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 18, Column: 9},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 19, Column: 9},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 20, Column: 9},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 21, Column: 9},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 22, Column: 9},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 23, Column: 9},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 24, Column: 9},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 25, Column: 27},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 26, Column: 9},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 29, Column: 43},
		{RuleName: "test-clock-for-time", Level: "error", Message: fixedWaitMessage, FilePath: "waits.test.ts", Line: 30, Column: 69},
	})
}
