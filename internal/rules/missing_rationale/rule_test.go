package missing_rationale

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", MissingRationaleRule, []analysis.Violation{
		{RuleName: "missing-rationale", Level: "error", Message: "RequestData lacks a complete, structurally supported data-structure rationale. Delete or reuse this concept before documenting it. If it remains, add one single-line comment directly above the declaration explaining because why existing concepts are insufficient. The prose does not suppress structural evidence.", FilePath: "src/violation.ts", Line: 1, Column: 18},
	})
}
