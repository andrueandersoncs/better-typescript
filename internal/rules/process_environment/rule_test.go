package process_environment

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", ProcessEnvironmentRule, []analysis.Violation{
		{RuleName: "process-environment", Level: "error", Message: "Read runtime configuration through Effect Config, not process.env. Read the key in a Config-backed layer and provide deterministic config in tests.", FilePath: "violation.ts", Line: 1, Column: 22},
	})
}
