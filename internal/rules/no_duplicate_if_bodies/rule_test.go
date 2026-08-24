package no_duplicate_if_bodies

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoDuplicateIfBodiesRule, []analysis.Violation{
		{RuleName: "no-duplicate-if-bodies", Level: "error", Message: "Avoid if branches that repeat the body of the branch before them. These branches are pseudo-duplicates: the bodies are identical and only the conditions differ. Combine them into a single branch: if (value === \"one\" || value === \"two\") { ... }.", FilePath: "src/violation.ts", Line: 3, Column: 3},
	})
}
