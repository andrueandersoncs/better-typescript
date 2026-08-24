package no_void_functions

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-void-functions", Level: "error", Message: "Avoid functions that return void. A void function either does nothing or performs a side-effect. If it does nothing, delete it. If it performs a side-effect, make it return an Effect — for example wrap the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not run. When a third-party API requires a void callback, annotate the value with that API's callback type so the void contract is the consumer's, not yours.", FilePath: "index.ts", Line: 1, Column: 17},
	})
}
