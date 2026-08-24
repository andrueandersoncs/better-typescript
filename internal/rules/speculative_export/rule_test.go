package speculative_export

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", SpeculativeExportRule, []analysis.Violation{
		{RuleName: "speculative-export", Level: "error", Message: "FutureSettlementProjection is exported without an independent first-party consumer or established boundary. Remove the export and keep ownership local, or connect the model to an intentional public seam. Exporting a declaration does not establish reuse and must not evade abstraction analysis.", FilePath: "violation.ts", Line: 1, Column: 18},
	})
}
