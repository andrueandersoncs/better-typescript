package require_construction_name_consistency

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-construction-name-consistency", Level: "error", Message: "user constructs a value, but does not use construction vocabulary. Rename with make/create/build/construct (for example makeUser), or use a recognized variant constructor such as some/none/left/right/succeed/fail/of.", FilePath: "index.ts", Line: 2, Column: 7},
	})
}
