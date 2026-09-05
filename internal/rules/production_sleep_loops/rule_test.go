package production_sleep_loops

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "production-sleep-loops", Level: "error", Message: "Prefer Effect.repeat with Schedule.spaced for fixed-pacing polling. Use Effect.repeat with Schedule.spaced when each iteration has a fixed pacing delay. Keep deadline, latch, and event-driven loops explicit because their timing is not schedule-equivalent.", FilePath: "index.ts", Line: 6, Column: 12},
		{RuleName: "production-sleep-loops", Level: "error", Message: "Prefer Effect.repeat with Schedule.spaced for fixed-pacing polling. Use Effect.repeat with Schedule.spaced when each iteration has a fixed pacing delay. Keep deadline, latch, and event-driven loops explicit because their timing is not schedule-equivalent.", FilePath: "index.ts", Line: 12, Column: 12},
	})
}
