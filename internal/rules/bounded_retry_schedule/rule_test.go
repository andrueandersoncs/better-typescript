package bounded_retry_schedule

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "bounded-retry-schedule", Level: "error", Message: "Use a finite retry recurrence unless a local waiver documents forever retry. Use Schedule.recurs(n), Schedule.upTo({ times: n }), or a Schedule.max branch that terminates.", FilePath: "index.ts", Line: 5, Column: 1},
		{RuleName: "bounded-retry-schedule", Level: "error", Message: "Use a finite retry recurrence unless a local waiver documents forever retry. Use Schedule.recurs(n), Schedule.upTo({ times: n }), or a Schedule.max branch that terminates.", FilePath: "index.ts", Line: 6, Column: 1},
		{RuleName: "bounded-retry-schedule", Level: "error", Message: "Use a finite retry recurrence unless a local waiver documents forever retry. Use Schedule.recurs(n), Schedule.upTo({ times: n }), or a Schedule.max branch that terminates.", FilePath: "index.ts", Line: 7, Column: 1},
		{RuleName: "bounded-retry-schedule", Level: "error", Message: "Use a finite retry recurrence unless a local waiver documents forever retry. Use Schedule.recurs(n), Schedule.upTo({ times: n }), or a Schedule.max branch that terminates.", FilePath: "index.ts", Line: 10, Column: 1},
		{RuleName: "bounded-retry-schedule", Level: "error", Message: "Use a finite retry recurrence unless a local waiver documents forever retry. Use Schedule.recurs(n), Schedule.upTo({ times: n }), or a Schedule.max branch that terminates.", FilePath: "index.ts", Line: 15, Column: 1},
		{RuleName: "bounded-retry-schedule", Level: "error", Message: "Use a finite retry recurrence unless a local waiver documents forever retry. Use Schedule.recurs(n), Schedule.upTo({ times: n }), or a Schedule.max branch that terminates.", FilePath: "index.ts", Line: 16, Column: 1},
		{RuleName: "bounded-retry-schedule", Level: "error", Message: "Use a finite retry recurrence unless a local waiver documents forever retry. Use Schedule.recurs(n), Schedule.upTo({ times: n }), or a Schedule.max branch that terminates.", FilePath: "index.ts", Line: 17, Column: 1},
		{RuleName: "bounded-retry-schedule", Level: "error", Message: "Use a finite retry recurrence unless a local waiver documents forever retry. Use Schedule.recurs(n), Schedule.upTo({ times: n }), or a Schedule.max branch that terminates.", FilePath: "index.ts", Line: 19, Column: 1},
	})
}
