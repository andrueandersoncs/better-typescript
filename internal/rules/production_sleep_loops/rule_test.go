package production_sleep_loops

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "production-sleep-loops", Level: "error", Message: "Avoid manual Effect.sleep loops; use Schedule and Effect.repeat. Express repetition, pacing, and backoff as an Effect Schedule.", FilePath: "index.ts", Line: 2, Column: 16},
	})
}
