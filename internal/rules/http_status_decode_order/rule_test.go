package http_status_decode_order

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "http-status-decode-order", Level: "error", Message: "Classify HTTP status before decoding a successful response body. Apply filterStatusOk or an equivalent response classifier first.", FilePath: "index.ts", Line: 15, Column: 43},
		{RuleName: "http-status-decode-order", Level: "error", Message: "Classify HTTP status before decoding a successful response body. Apply filterStatusOk or an equivalent response classifier first.", FilePath: "index.ts", Line: 19, Column: 23},
		{RuleName: "http-status-decode-order", Level: "error", Message: "Classify HTTP status before decoding a successful response body. Apply filterStatusOk or an equivalent response classifier first.", FilePath: "index.ts", Line: 34, Column: 43},
		{RuleName: "http-status-decode-order", Level: "error", Message: "Classify HTTP status before decoding a successful response body. Apply filterStatusOk or an equivalent response classifier first.", FilePath: "semantics.ts", Line: 6, Column: 10},
	})
}
