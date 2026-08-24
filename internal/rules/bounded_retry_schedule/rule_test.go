package bounded_retry_schedule

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "bounded-retry-schedule", Level: "error", Message: "Use a bounded retry schedule unless a local waiver documents forever retry. Use recurs or upTo to make retries operationally bounded.", FilePath: "index.ts", Line: 2, Column: 1},
	})
}
