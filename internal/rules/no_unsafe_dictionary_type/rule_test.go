package no_unsafe_dictionary_type

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-unsafe-dictionary-type", Level: "error", Message: "This dictionary's unknown value type gives callers no concrete value contract. Use an owner/schema-derived value type; parse external payloads before insertion.", FilePath: "cases.ts", Line: 1, Column: 17},
		{RuleName: "no-unsafe-dictionary-type", Level: "error", Message: "This dictionary's any value type gives callers no concrete value contract. Use an owner/schema-derived value type; parse external payloads before insertion.", FilePath: "cases.ts", Line: 2, Column: 14},
		{RuleName: "no-unsafe-dictionary-type", Level: "error", Message: "This dictionary's unknown value type gives callers no concrete value contract. Use an owner/schema-derived value type; parse external payloads before insertion.", FilePath: "cases.ts", Line: 7, Column: 18},
		{RuleName: "no-unsafe-dictionary-type", Level: "error", Message: "This dictionary's unknown value type gives callers no concrete value contract. Use an owner/schema-derived value type; parse external payloads before insertion.", FilePath: "cases.ts", Line: 10, Column: 31},
	})
}
