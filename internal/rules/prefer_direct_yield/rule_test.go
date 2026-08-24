package prefer_direct_yield

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-direct-yield", Level: "error", Message: "Avoid binding an Effect only to yield* it. Write const result = yield* expression (or yield* expression when the result is unused) instead of naming a temporary Effect and yielding that name. Keep extracting nested call arguments into their own consts so no-nested-calls stays satisfied.", FilePath: "violation.ts", Line: 3, Column: 9},
	})
}
