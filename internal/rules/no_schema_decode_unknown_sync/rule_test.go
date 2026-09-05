package no_schema_decode_unknown_sync

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	const diagnostic = "Avoid Schema.decodeUnknownSync. Use Schema.decodeUnknownEffect and handle decoding failures in the Effect error channel."
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-schema-decode-unknown-sync", Level: "error", Message: diagnostic, FilePath: "violation.ts", Line: 5, Column: 24},
		{RuleName: "no-schema-decode-unknown-sync", Level: "error", Message: diagnostic, FilePath: "violation.ts", Line: 6, Column: 32},
		{RuleName: "no-schema-decode-unknown-sync", Level: "error", Message: diagnostic, FilePath: "violation.ts", Line: 7, Column: 31},
	})
}
