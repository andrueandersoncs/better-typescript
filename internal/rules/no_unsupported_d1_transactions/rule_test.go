package no_unsupported_d1_transactions

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-unsupported-d1-transactions", Level: "error", Message: "D1Client.withTransaction always defects because D1 transactions are unsupported. Use D1Client.batch for a fixed collection of D1 statements; it cannot replace an arbitrary Effect transaction body.", FilePath: "violation.ts", Line: 7, Column: 1},
		{RuleName: "no-unsupported-d1-transactions", Level: "error", Message: "D1Client.withTransaction always defects because D1 transactions are unsupported. Use D1Client.batch for a fixed collection of D1 statements; it cannot replace an arbitrary Effect transaction body.", FilePath: "violation.ts", Line: 9, Column: 1},
		{RuleName: "no-unsupported-d1-transactions", Level: "error", Message: "D1Client.withTransaction always defects because D1 transactions are unsupported. Use D1Client.batch for a fixed collection of D1 statements; it cannot replace an arbitrary Effect transaction body.", FilePath: "violation.ts", Line: 10, Column: 13},
		{RuleName: "no-unsupported-d1-transactions", Level: "error", Message: "D1Client.withTransaction always defects because D1 transactions are unsupported. Use D1Client.batch for a fixed collection of D1 statements; it cannot replace an arbitrary Effect transaction body.", FilePath: "violation.ts", Line: 11, Column: 14},
	})
}
