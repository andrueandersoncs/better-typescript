package config_refined_values

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "config-refined-values", Level: "error", Message: "Refine configuration values. Use Config.schema or Config.mapOrFail for path, URL, port, and identifier values.", FilePath: "index.ts", Line: 2, Column: 1},
	})
}
