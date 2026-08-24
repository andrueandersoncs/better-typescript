package idempotent_retry

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", IdempotentRetryRule, []analysis.Violation{
		{RuleName: "idempotent-retry", Level: "error", Message: "Retry only idempotent operations. Establish idempotency in the domain contract before applying retry.", FilePath: "src/violation.ts", Line: 2, Column: 31},
	})
}
