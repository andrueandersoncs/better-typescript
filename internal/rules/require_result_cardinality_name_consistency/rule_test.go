package require_result_cardinality_name_consistency

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-result-cardinality-name-consistency", Level: "error", Message: "getUser names its result as singular user, but returns many. Rename the result noun to plural users so the name matches the collection result.", FilePath: "index.ts", Line: 2, Column: 7},
	})
}
