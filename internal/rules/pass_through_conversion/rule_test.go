package pass_through_conversion

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "pass-through-conversion", Level: "error", Message: "toDomain copies WireIdentity into DomainIdentity without transformation. Collapse the parallel representations or document and preserve the real boundary that requires both. A field-for-field adapter is evidence against introducing another first-party concept.", FilePath: "index.ts", Line: 3, Column: 70},
	})
}
