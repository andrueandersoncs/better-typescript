package prefer_function_for_repeated_shape

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-function-for-repeated-shape", Level: "error", Message: "This statement repeats a substantial shape for the third time. Extract the shared structure into a regular or higher-order function, with the differing expressions as parameters. Earlier matching statements start on lines 4 and 5.", FilePath: "literals.ts", Line: 6, Column: 1},
		{RuleName: "prefer-function-for-repeated-shape", Level: "error", Message: "This statement repeats a substantial shape for the third time. Extract the shared structure into a regular or higher-order function, with the differing expressions as parameters. Earlier matching statements start on lines 7 and 8.", FilePath: "stability.ts", Line: 10, Column: 1},
		{RuleName: "prefer-function-for-repeated-shape", Level: "error", Message: "This statement repeats a substantial shape for the third time. Extract the shared structure into a regular or higher-order function, with the differing expressions as parameters. Earlier matching statements start on lines 8 and 10.", FilePath: "violation.ts", Line: 12, Column: 3},
		{RuleName: "prefer-function-for-repeated-shape", Level: "error", Message: "This statement repeats a substantial shape for the third time. Extract the shared structure into a regular or higher-order function, with the differing expressions as parameters. Earlier matching statements start on lines 9 and 14.", FilePath: "wrappers.ts", Line: 19, Column: 1},
	})
}
