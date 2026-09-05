package http_response_validation

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "http-response-validation", Level: "error", Message: "Decode unknown HTTP response data with Schema at the adapter boundary. Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder.", FilePath: "index.ts", Line: 13, Column: 28},
		{RuleName: "http-response-validation", Level: "error", Message: "Decode unknown HTTP response data with Schema at the adapter boundary. Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder.", FilePath: "index.ts", Line: 18, Column: 10},
		{RuleName: "http-response-validation", Level: "error", Message: "Decode unknown HTTP response data with Schema at the adapter boundary. Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder.", FilePath: "index.ts", Line: 23, Column: 10},
		{RuleName: "http-response-validation", Level: "error", Message: "Decode unknown HTTP response data with Schema at the adapter boundary. Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder.", FilePath: "index.ts", Line: 33, Column: 17},
		{RuleName: "http-response-validation", Level: "error", Message: "Decode unknown HTTP response data with Schema at the adapter boundary. Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder.", FilePath: "index.ts", Line: 53, Column: 10},
		{RuleName: "http-response-validation", Level: "error", Message: "Decode unknown HTTP response data with Schema at the adapter boundary. Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder.", FilePath: "semantics.ts", Line: 6, Column: 10},
	})
}
