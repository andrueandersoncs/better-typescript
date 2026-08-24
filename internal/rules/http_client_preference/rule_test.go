package http_client_preference

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "http-client-preference", Level: "error", Message: "Prefer Effect HttpClient for HTTP adapters. Use Effect's typed HTTP client unless a documented raw-fetch exception applies.", FilePath: "index.ts", Line: 2, Column: 25},
	})
}
