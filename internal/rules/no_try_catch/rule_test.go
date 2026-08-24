package no_try_catch

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-try-catch", Level: "error", Message: "Avoid try/catch for error handling. Model effectful code that can fail as an Effect and declare its failures as explicit Schema.TaggedErrorClass classes, for example: class FetchError extends Schema.TaggedErrorClass<FetchError>()(\"FetchError\", {}) {}. Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catch) instead of catching inside a try block.", FilePath: "index.ts", Line: 1, Column: 25},
	})
}
