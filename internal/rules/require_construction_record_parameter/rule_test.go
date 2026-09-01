package require_construction_record_parameter

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-construction-record-parameter", Level: "error", Message: "make takes 2 positional parameters instead of one named record. Replace the positional parameters with one named object parameter so callers pass fields by name.", FilePath: "named.ts", Line: 1, Column: 14},
		{RuleName: "require-construction-record-parameter", Level: "error", Message: "make takes 2 positional parameters instead of one named record. Replace the positional parameters with one named object parameter so callers pass fields by name.", FilePath: "violation.ts", Line: 2, Column: 3},
	})
}
