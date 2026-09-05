package no_new_error

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-new-error", Level: "error", Message: "Avoid using new Error() directly. Declare a custom error with Effect Schema.TaggedErrorClass, then construct it with CustomError.make(...) instead of bare new Error().", FilePath: "src/cases.ts", Line: 1, Column: 19},
	})
}
