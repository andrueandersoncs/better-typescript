package no_mutation

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-mutation", Level: "error", Message: "Avoid mutating first-party data. Application code should derive a new value — Array.replace or Array.modify for elements, Struct.evolve for record fields, and a fresh const for rebindings. An owned library kernel may use a local mutable builder only under explicit project policy; this rule does not infer that exception. For shared state, use Ref.update or Ref.modify for pure atomic transitions, SynchronizedRef.updateEffect or SynchronizedRef.modifyEffect for effectful transitions, and Effect.tx with TxRef for atomic multi-cell transitions. Contention alone does not require SynchronizedRef. Use PubSub for subscriber sets. A local cell does not automatically require a Layer; use a Layer only for an actual resource or lifetime boundary. Never mutate built-ins (prototypes, globals). Mutating a third-party structure whose API contract requires assignment (process.exitCode, a WebSocket handler slot, a React ref cell) is permitted.", FilePath: "src/cases.ts", Line: 3, Column: 1},
	})
}
