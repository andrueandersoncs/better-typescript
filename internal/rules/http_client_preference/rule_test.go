package http_client_preference

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "http-client-preference", Level: "error", Message: "Prefer Effect HttpClient for HTTP adapters. Use Effect's typed HTTP client unless this fetch implements a direct HttpClient.make adapter.", FilePath: "index.ts", Line: 10, Column: 25},
		{RuleName: "http-client-preference", Level: "error", Message: "Prefer Effect HttpClient for HTTP adapters. Use Effect's typed HTTP client unless this fetch implements a direct HttpClient.make adapter.", FilePath: "index.ts", Line: 11, Column: 12},
		{RuleName: "http-client-preference", Level: "error", Message: "Prefer Effect HttpClient for HTTP adapters. Use Effect's typed HTTP client unless this fetch implements a direct HttpClient.make adapter.", FilePath: "index.ts", Line: 12, Column: 32},
		{RuleName: "http-client-preference", Level: "error", Message: "Prefer Effect HttpClient for HTTP adapters. Use Effect's typed HTTP client unless this fetch implements a direct HttpClient.make adapter.", FilePath: "index.ts", Line: 14, Column: 26},
		{RuleName: "http-client-preference", Level: "error", Message: "Prefer Effect HttpClient for HTTP adapters. Use Effect's typed HTTP client unless this fetch implements a direct HttpClient.make adapter.", FilePath: "index.ts", Line: 15, Column: 36},
	})
}

func TestNodeFetch(t *testing.T) {
	ruletest.Assert(t, "testdata/node", Rule, []analysis.Violation{
		{RuleName: "http-client-preference", Level: "error", Message: "Prefer Effect HttpClient for HTTP adapters. Use Effect's typed HTTP client unless this fetch implements a direct HttpClient.make adapter.", FilePath: "index.ts", Line: 2, Column: 25},
	})
}
