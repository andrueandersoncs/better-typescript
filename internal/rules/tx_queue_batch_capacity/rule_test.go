package tx_queue_batch_capacity

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "tx-queue-batch-capacity", Level: "error", Message: "Do not offer a larger atomic batch than a bounded TxQueue can hold. Use a bounded TxQueue with capacity at least the batch size, or choose a queue and delivery protocol that permit incremental offers.", FilePath: "index.ts", Line: 9, Column: 37},
		{RuleName: "tx-queue-batch-capacity", Level: "error", Message: "Do not offer a larger atomic batch than a bounded TxQueue can hold. Use a bounded TxQueue with capacity at least the batch size, or choose a queue and delivery protocol that permit incremental offers.", FilePath: "index.ts", Line: 14, Column: 33},
	})
}
