package duplicate_shape

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "duplicate-shape", Level: "error", Message: "UserRow duplicates the concrete structure of UserRecord. Reuse the existing data structure or merge the concepts. Keep a distinct representation only for an independently evolving boundary or invariant, and retain the duplicate evidence for review.", FilePath: "index.ts", Line: 1, Column: 11},
	})
}
