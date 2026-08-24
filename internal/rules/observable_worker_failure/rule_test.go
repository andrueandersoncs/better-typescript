package observable_worker_failure

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "observable-worker-failure", Level: "error", Message: "Make worker failures observable. Log expected item failures or make the skip policy explicit at the owning worker boundary.", FilePath: "index.ts", Line: 2, Column: 20},
	})
}
