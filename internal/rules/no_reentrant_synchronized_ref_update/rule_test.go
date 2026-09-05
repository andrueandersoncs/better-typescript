package no_reentrant_synchronized_ref_update

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-reentrant-synchronized-ref-update", Level: "error", Message: "Do not reacquire a synchronized ref lock from its update callback. Compute the next value inside the callback, then let the outer update store it. Do not run another mutation of the same ref until the callback has returned.", FilePath: "index.ts", Line: 7, Column: 46},
		{RuleName: "no-reentrant-synchronized-ref-update", Level: "error", Message: "Do not reacquire a synchronized ref lock from its update callback. Compute the next value inside the callback, then let the outer update store it. Do not run another mutation of the same ref until the callback has returned.", FilePath: "index.ts", Line: 9, Column: 10},
		{RuleName: "no-reentrant-synchronized-ref-update", Level: "error", Message: "Do not reacquire a synchronized ref lock from its update callback. Compute the next value inside the callback, then let the outer update store it. Do not run another mutation of the same ref until the callback has returned.", FilePath: "index.ts", Line: 12, Column: 55},
		{RuleName: "no-reentrant-synchronized-ref-update", Level: "error", Message: "Do not reacquire a synchronized ref lock from its update callback. Compute the next value inside the callback, then let the outer update store it. Do not run another mutation of the same ref until the callback has returned.", FilePath: "index.ts", Line: 13, Column: 41},
	})
}
