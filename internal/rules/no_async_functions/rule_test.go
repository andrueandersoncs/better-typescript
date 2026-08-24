package no_async_functions

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoAsyncFunctionsRule, []analysis.Violation{
		{RuleName: "no-async-functions", Level: "error", Message: "Avoid declaring functions as async. Model asynchronous work with Effect instead of async/await. To integrate with a third-party library: wrap incoming promises with Effect.tryPromise; satisfy an outgoing Promise-returning callback contract with a non-async function that returns Effect.runPromise(effect).", FilePath: "src/violation.ts", Line: 1, Column: 8},
	})
}
