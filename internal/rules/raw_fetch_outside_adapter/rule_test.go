package raw_fetch_outside_adapter

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "raw-fetch-outside-adapter", Level: "error", Message: "Keep raw fetch in an adapter. Move raw fetch behind a named adapter boundary or use Effect HttpClient.", FilePath: "index.ts", Line: 9, Column: 1},
		{RuleName: "raw-fetch-outside-adapter", Level: "error", Message: "Keep raw fetch in an adapter. Move raw fetch behind a named adapter boundary or use Effect HttpClient.", FilePath: "index.ts", Line: 15, Column: 26},
	})
}

func TestNodeFetch(t *testing.T) {
	ruletest.Assert(t, "testdata/node", Rule, []analysis.Violation{
		{RuleName: "raw-fetch-outside-adapter", Level: "error", Message: "Keep raw fetch in an adapter. Move raw fetch behind a named adapter boundary or use Effect HttpClient.", FilePath: "index.ts", Line: 1, Column: 1},
	})
}
