package observable_worker_failure

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "observable-worker-failure", Level: "error", Message: "Make worker failures observable. Log the ignored failure or make the skip policy explicit at the owning worker boundary.", FilePath: "index.ts", Line: 4, Column: 1},
		{RuleName: "observable-worker-failure", Level: "error", Message: "Make worker failures observable. Log the ignored failure or make the skip policy explicit at the owning worker boundary.", FilePath: "index.ts", Line: 13, Column: 1},
		{RuleName: "observable-worker-failure", Level: "error", Message: "Make worker failures observable. Log the ignored failure or make the skip policy explicit at the owning worker boundary.", FilePath: "index.ts", Line: 14, Column: 1},
		{RuleName: "observable-worker-failure", Level: "error", Message: "Make worker failures observable. Log the ignored failure or make the skip policy explicit at the owning worker boundary.", FilePath: "index.ts", Line: 16, Column: 1},
		{RuleName: "observable-worker-failure", Level: "error", Message: "Make worker failures observable. Log the ignored failure or make the skip policy explicit at the owning worker boundary.", FilePath: "index.ts", Line: 23, Column: 10},
	})
}
