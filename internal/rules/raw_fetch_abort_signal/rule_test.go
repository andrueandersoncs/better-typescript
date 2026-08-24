package raw_fetch_abort_signal

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "raw-fetch-abort-signal", Level: "error", Message: "Pass Effect.tryPromise's AbortSignal to raw fetch. Accept the tryPromise signal and pass it as fetch's init.signal.", FilePath: "index.ts", Line: 2, Column: 1},
	})
}
