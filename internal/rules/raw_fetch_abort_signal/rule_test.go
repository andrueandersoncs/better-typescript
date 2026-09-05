package raw_fetch_abort_signal

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "raw-fetch-abort-signal", Level: "error", Message: "Pass Effect.tryPromise's AbortSignal to raw fetch. Pass the tryPromise or enclosing HttpClient.make signal as fetch's init.signal.", FilePath: "index.ts", Line: 9, Column: 31},
		{RuleName: "raw-fetch-abort-signal", Level: "error", Message: "Pass Effect.tryPromise's AbortSignal to raw fetch. Pass the tryPromise or enclosing HttpClient.make signal as fetch's init.signal.", FilePath: "index.ts", Line: 12, Column: 31},
		{RuleName: "raw-fetch-abort-signal", Level: "error", Message: "Pass Effect.tryPromise's AbortSignal to raw fetch. Pass the tryPromise or enclosing HttpClient.make signal as fetch's init.signal.", FilePath: "index.ts", Line: 18, Column: 31},
	})
}

func TestNodeFetch(t *testing.T) {
	ruletest.Assert(t, "testdata/node", Rule, []analysis.Violation{
		{RuleName: "raw-fetch-abort-signal", Level: "error", Message: "Pass Effect.tryPromise's AbortSignal to raw fetch. Pass the tryPromise or enclosing HttpClient.make signal as fetch's init.signal.", FilePath: "index.ts", Line: 2, Column: 31},
	})
}
