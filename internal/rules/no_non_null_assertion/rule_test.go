package no_non_null_assertion

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-non-null-assertion", Level: "error", Message: "Avoid non-null assertions. The ! operator silences the type checker instead of handling the absent case, trading a compile-time proof for a runtime crash. Convert the nullable value with Option.fromNullishOr and handle both branches (Option.match, Option.getOrElse), or narrow it with a type guard the checker verifies.", FilePath: "src/cases.ts", Line: 2, Column: 19},
	})
}
