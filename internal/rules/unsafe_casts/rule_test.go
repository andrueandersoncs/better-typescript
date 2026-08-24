package unsafe_casts

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", UnsafeCastsRule, []analysis.Violation{
		{RuleName: "unsafe-casts", Level: "error", Message: "Avoid unchecked `as any` assertions in Effect code. Model the missing invariant with Schema decoding, a branded type, or a verified narrowing predicate.", FilePath: "violation.ts", Line: 1, Column: 31},
	})
}
