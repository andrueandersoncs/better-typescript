package prefer_result_concept_names

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferResultConceptNamesRule, []analysis.Violation{
		{RuleName: "prefer-result-concept-names", Level: "error", Message: "selectedCustomer names its result as customer, but it returns name. Rename the result phrase to name. Preserve operation and source qualifiers, using nameFromSource or sourceToname when direction matters.", FilePath: "violation.ts", Line: 2, Column: 14},
	})
}
