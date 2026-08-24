package require_result_shape_name_consistency

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-result-shape-name-consistency", Level: "error", Message: "countUsers claims a number result via count, but returns string. Align the name with the actual result, or change the return type to number. Keep strong operation words only when the result shape matches.", FilePath: "index.ts", Line: 1, Column: 7},
	})
}
