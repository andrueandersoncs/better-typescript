package unused_field

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", UnusedFieldRule, []analysis.Violation{
		{RuleName: "unused-field", Level: "error", Message: "Computed.Field is constructed but never independently read. Delete the speculative field or connect it to behavior that consumes its semantics.", FilePath: "src/computed.ts", Line: 3, Column: 3},
		{RuleName: "unused-field", Level: "error", Message: "Merged.second is constructed but never independently read. Delete the speculative field or connect it to behavior that consumes its semantics.", FilePath: "src/merged-b.ts", Line: 2, Column: 3},
		{RuleName: "unused-field", Level: "error", Message: "Draft.forecast is constructed but never independently read. Delete the speculative field or connect it to behavior that consumes its semantics.", FilePath: "src/violation.ts", Line: 3, Column: 3},
	})
}
