package global_config_mutation

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "global-config-mutation", Level: "error", Message: "Avoid mutating process.env in tests; provide deterministic Config instead. Use ConfigProvider.fromUnknown or a test configuration service.", FilePath: "index.ts", Line: 1, Column: 1},
	})
}
