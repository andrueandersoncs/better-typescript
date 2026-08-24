package prefer_curried_data_last_functions

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-curried-data-last-functions", Level: "error", Message: "Avoid rest parameters and multiple runtime parameters in one function. Curry runtime parameters into unary functions so configuration comes first and the primary data value is supplied last.", FilePath: "violation.ts", Line: 1, Column: 10},
	})
}
