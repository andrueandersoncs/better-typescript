package retry_without_jitter

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "retry-without-jitter", Level: "error", Message: "Jitter exponential or Fibonacci retry delays. Wrap each exponential or Fibonacci retry branch with Schedule.jittered when deterministic timing is not deliberate.", FilePath: "index.ts", Line: 5, Column: 1},
		{RuleName: "retry-without-jitter", Level: "error", Message: "Jitter exponential or Fibonacci retry delays. Wrap each exponential or Fibonacci retry branch with Schedule.jittered when deterministic timing is not deliberate.", FilePath: "index.ts", Line: 8, Column: 1},
		{RuleName: "retry-without-jitter", Level: "error", Message: "Jitter exponential or Fibonacci retry delays. Wrap each exponential or Fibonacci retry branch with Schedule.jittered when deterministic timing is not deliberate.", FilePath: "index.ts", Line: 10, Column: 1},
		{RuleName: "retry-without-jitter", Level: "error", Message: "Jitter exponential or Fibonacci retry delays. Wrap each exponential or Fibonacci retry branch with Schedule.jittered when deterministic timing is not deliberate.", FilePath: "index.ts", Line: 13, Column: 1},
		{RuleName: "retry-without-jitter", Level: "error", Message: "Jitter exponential or Fibonacci retry delays. Wrap each exponential or Fibonacci retry branch with Schedule.jittered when deterministic timing is not deliberate.", FilePath: "index.ts", Line: 14, Column: 1},
	})
}
