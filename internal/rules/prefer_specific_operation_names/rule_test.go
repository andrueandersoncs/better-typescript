package prefer_specific_operation_names

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferSpecificOperationNamesRule, []analysis.Violation{
		{RuleName: "prefer-specific-operation-names", Level: "error", Message: "processCustomer uses the vague operation process, but its body has a unique conversion role. Rename to decodeCustomer, preserving the known object or result noun.", FilePath: "violation.ts", Line: 3, Column: 14},
	})
}
