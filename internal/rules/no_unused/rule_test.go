package no_unused

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-unused", Level: "error", Message: "Avoid unused imports, declarations, and parameters. Delete the unused import, variable, function, type, or parameter. If a parameter is required by a signature but intentionally unused, prefix its name with an underscore.", FilePath: "index.ts", Line: 1, Column: 7},
	})
}
