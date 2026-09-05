package deterministic_durable_key

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "deterministic-durable-key", Level: "error", Message: "Do not derive a durable key from randomness or the current time. Generate the ID once in the payload, then return that stable payload value from idempotencyKey or primaryKey.", FilePath: "violation.ts", Line: 7, Column: 25},
		{RuleName: "deterministic-durable-key", Level: "error", Message: "Do not derive a durable key from randomness or the current time. Generate the ID once in the payload, then return that stable payload value from idempotencyKey or primaryKey.", FilePath: "violation.ts", Line: 14, Column: 17},
		{RuleName: "deterministic-durable-key", Level: "error", Message: "Do not derive a durable key from randomness or the current time. Generate the ID once in the payload, then return that stable payload value from idempotencyKey or primaryKey.", FilePath: "violation.ts", Line: 21, Column: 21},
		{RuleName: "deterministic-durable-key", Level: "error", Message: "Do not derive a durable key from randomness or the current time. Generate the ID once in the payload, then return that stable payload value from idempotencyKey or primaryKey.", FilePath: "violation.ts", Line: 26, Column: 25},
		{RuleName: "deterministic-durable-key", Level: "error", Message: "Do not derive a durable key from randomness or the current time. Generate the ID once in the payload, then return that stable payload value from idempotencyKey or primaryKey.", FilePath: "violation.ts", Line: 31, Column: 21},
		{RuleName: "deterministic-durable-key", Level: "error", Message: "Do not derive a durable key from randomness or the current time. Generate the ID once in the payload, then return that stable payload value from idempotencyKey or primaryKey.", FilePath: "violation.ts", Line: 36, Column: 16},
		{RuleName: "deterministic-durable-key", Level: "error", Message: "Do not derive a durable key from randomness or the current time. Generate the ID once in the payload, then return that stable payload value from idempotencyKey or primaryKey.", FilePath: "violation.ts", Line: 44, Column: 16},
	})
}
