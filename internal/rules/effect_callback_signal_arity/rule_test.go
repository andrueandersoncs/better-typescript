package effect_callback_signal_arity

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "effect-callback-signal-arity", Level: "error", Message: "Do not default an Effect cancellation-signal parameter. Leave the injected signal parameter required so Effect passes its AbortSignal, or use a signal-free callback when the fallback is intentional.", FilePath: "index.ts", Line: 5, Column: 17},
		{RuleName: "effect-callback-signal-arity", Level: "error", Message: "Do not default an Effect cancellation-signal parameter. Leave the injected signal parameter required so Effect passes its AbortSignal, or use a signal-free callback when the fallback is intentional.", FilePath: "index.ts", Line: 6, Column: 20},
		{RuleName: "effect-callback-signal-arity", Level: "error", Message: "Do not default an Effect cancellation-signal parameter. Leave the injected signal parameter required so Effect passes its AbortSignal, or use a signal-free callback when the fallback is intentional.", FilePath: "index.ts", Line: 7, Column: 27},
		{RuleName: "effect-callback-signal-arity", Level: "error", Message: "Do not default an Effect cancellation-signal parameter. Leave the injected signal parameter required so Effect passes its AbortSignal, or use a signal-free callback when the fallback is intentional.", FilePath: "index.ts", Line: 8, Column: 26},
		{RuleName: "effect-callback-signal-arity", Level: "error", Message: "Do not default an Effect cancellation-signal parameter. Leave the injected signal parameter required so Effect passes its AbortSignal, or use a signal-free callback when the fallback is intentional.", FilePath: "index.ts", Line: 9, Column: 18},
	})
}
