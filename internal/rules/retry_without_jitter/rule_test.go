package retry_without_jitter

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "retry-without-jitter", Level: "error", Message: "Jitter exponential retry. Add Schedule.jittered to the bounded backoff schedule.", FilePath: "index.ts", Line: 3, Column: 1},
	})
}
