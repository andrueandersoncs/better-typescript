package no_immediate_effect_sync

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-immediate-effect-sync", Level: "error", Message: "Avoid immediately running a locally bound Effect.sync. Run the synchronous action directly at this startup boundary, or retain the Effect only when it is deferred or composed into a larger workflow.", FilePath: "src/cases.ts", Line: 3, Column: 1},
	})
}
