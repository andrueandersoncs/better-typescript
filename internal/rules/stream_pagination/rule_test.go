package stream_pagination

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", StreamPaginationRule, []analysis.Violation{
		{RuleName: "stream-pagination", Level: "error", Message: "Prefer Stream.paginate for a manual effectful page loop. Use Stream.paginate with an effectful page callback returning [items, Option<nextCursor>].", FilePath: "violation.ts", Line: 8, Column: 3},
	})
}
