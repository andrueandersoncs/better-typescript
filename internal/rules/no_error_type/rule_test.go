package no_error_type

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoErrorTypeRule, []analysis.Violation{
		{RuleName: "no-error-type", Level: "error", Message: "Avoid the built-in Error type. Use a specific tagged error type for known failures, preserve the caller's error type with a type parameter, or use unknown at an untyped boundary.", FilePath: "src/violation.ts", Line: 1, Column: 34},
	})
}
