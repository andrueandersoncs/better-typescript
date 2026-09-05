package config_refined_values

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	const diagnostic = "Refine configuration values. Use Config.URL or Config.schema with a suitable Schema for path, URL, port, and identifier values."
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "config-refined-values", Level: "error", Message: diagnostic, FilePath: "index.ts", Line: 6, Column: 1},
		{RuleName: "config-refined-values", Level: "error", Message: diagnostic, FilePath: "index.ts", Line: 7, Column: 18},
		{RuleName: "config-refined-values", Level: "error", Message: diagnostic, FilePath: "index.ts", Line: 8, Column: 1},
		{RuleName: "config-refined-values", Level: "error", Message: diagnostic, FilePath: "index.ts", Line: 21, Column: 1},
	})
}
