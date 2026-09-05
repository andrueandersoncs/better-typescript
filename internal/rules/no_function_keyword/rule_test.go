package no_function_keyword

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoFunctionKeywordRule, []analysis.Violation{
		{RuleName: "no-function-keyword", Level: "error", Message: "Avoid using the function keyword. Declare this function as a const using fat-arrow syntax instead. Keep functions that own this, arguments, or new.target, declarations needed for overload signatures, and function* when their semantics are required.", FilePath: "src/clean.ts", Line: 23, Column: 39},
		{RuleName: "no-function-keyword", Level: "error", Message: "Avoid using the function keyword. Declare this function as a const using fat-arrow syntax instead. Keep functions that own this, arguments, or new.target, declarations needed for overload signatures, and function* when their semantics are required.", FilePath: "src/violation.ts", Line: 1, Column: 8},
		{RuleName: "no-function-keyword", Level: "error", Message: "Avoid using the function keyword. Declare this function as a const using fat-arrow syntax instead. Keep functions that own this, arguments, or new.target, declarations needed for overload signatures, and function* when their semantics are required.", FilePath: "src/violation.ts", Line: 2, Column: 22},
		{RuleName: "no-function-keyword", Level: "error", Message: "Avoid using the function keyword. Declare this function as a const using fat-arrow syntax instead. Keep functions that own this, arguments, or new.target, declarations needed for overload signatures, and function* when their semantics are required.", FilePath: "src/violation.ts", Line: 3, Column: 29},
	})
}
