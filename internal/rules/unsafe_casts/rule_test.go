package unsafe_casts

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

const unknownCastMessage = "Avoid asserting an `unknown` value to a concrete type. Change the algorithm or data structure so the value keeps its type, or prove the target with Schema decoding or a verified narrowing predicate."

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", UnsafeCastsRule, []analysis.Violation{
		{RuleName: "unsafe-casts", Level: "error", Message: unknownCastMessage, FilePath: "semantic_violation.ts", Line: 7, Column: 31},
		{RuleName: "unsafe-casts", Level: "error", Message: unknownCastMessage, FilePath: "semantic_violation.ts", Line: 8, Column: 44},
		{RuleName: "unsafe-casts", Level: "error", Message: unknownCastMessage, FilePath: "semantic_violation.ts", Line: 10, Column: 31},
		{RuleName: "unsafe-casts", Level: "error", Message: unknownCastMessage, FilePath: "semantic_violation.ts", Line: 12, Column: 30},
		{RuleName: "unsafe-casts", Level: "error", Message: unknownCastMessage, FilePath: "semantic_violation.ts", Line: 13, Column: 35},
		{RuleName: "unsafe-casts", Level: "error", Message: unknownCastMessage, FilePath: "semantic_violation.ts", Line: 14, Column: 40},
		{RuleName: "unsafe-casts", Level: "error", Message: unknownCastMessage, FilePath: "semantic_violation.ts", Line: 15, Column: 25},
		{RuleName: "unsafe-casts", Level: "error", Message: "Avoid unchecked `as any` assertions in Effect code. Model the missing invariant with Schema decoding, a branded type, or a verified narrowing predicate.", FilePath: "violation.ts", Line: 1, Column: 31},
	})
}
