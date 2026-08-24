package no_throw

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-throw", Level: "error", Message: "Avoid throwing errors with throw. Create a custom error with Schema.TaggedErrorClass, then yield it instead, for example: class CustomError extends Schema.TaggedErrorClass<CustomError>()(\"CustomError\", {}) {}; yield* new CustomError().", FilePath: "index.ts", Line: 1, Column: 25},
	})
}
