package stream_pagination

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", StreamPaginationRule, []analysis.Violation{
		{RuleName: "stream-pagination", Level: "error", Message: "Prefer Stream.paginate. Use Stream.paginate for an effectful token-based page source.", FilePath: "violation.ts", Line: 4, Column: 3},
	})
}
