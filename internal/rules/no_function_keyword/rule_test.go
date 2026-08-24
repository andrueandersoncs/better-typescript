package no_function_keyword

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoFunctionKeywordRule, []analysis.Violation{
		{RuleName: "no-function-keyword", Level: "error", Message: "Avoid using the function keyword. Declare this function as a const using fat-arrow syntax instead. Keep function declarations only when overload signatures are required, and keep function* when generator semantics are required.", FilePath: "src/violation.ts", Line: 1, Column: 8},
	})
}
