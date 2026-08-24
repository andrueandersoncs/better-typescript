package http_response_validation

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "http-response-validation", Level: "error", Message: "Decode unknown HTTP response data with Schema at the adapter boundary. Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder.", FilePath: "index.ts", Line: 2, Column: 38},
	})
}
