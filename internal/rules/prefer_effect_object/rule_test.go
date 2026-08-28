package prefer_effect_object

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-object", Level: "error", Message: "Avoid Object.keys(). Use Struct.keys or Record.keys from Effect instead.", FilePath: "violation.ts", Line: 4, Column: 14},
		{RuleName: "prefer-effect-object", Level: "error", Message: "Avoid Object.entries(). Use Record.toEntries from Effect instead.", FilePath: "violation.ts", Line: 5, Column: 17},
		{RuleName: "prefer-effect-object", Level: "error", Message: "Avoid Object.values(). Use Record.values from Effect instead.", FilePath: "violation.ts", Line: 6, Column: 16},
		{RuleName: "prefer-effect-object", Level: "error", Message: "Avoid Object.fromEntries(). Use Record.fromEntries from Effect instead.", FilePath: "violation.ts", Line: 7, Column: 17},
		{RuleName: "prefer-effect-object", Level: "error", Message: "Avoid Object.hasOwn(). Use Record.has from Effect instead.", FilePath: "violation.ts", Line: 8, Column: 14},
		{RuleName: "prefer-effect-object", Level: "error", Message: "Avoid Object.assign(). Use Struct.assign from Effect instead.", FilePath: "violation.ts", Line: 9, Column: 16},
		{RuleName: "prefer-effect-object", Level: "error", Message: "Avoid Object.is(). Use Equivalence.strictEqual from Effect instead.", FilePath: "violation.ts", Line: 10, Column: 14},
		{RuleName: "prefer-effect-object", Level: "error", Message: "Avoid Object.groupBy(). Use Array.groupBy from Effect instead.", FilePath: "violation.ts", Line: 11, Column: 17},
		{RuleName: "prefer-effect-object", Level: "error", Message: "Avoid Object.prototype.hasOwnProperty(). Use Record.has from Effect instead.", FilePath: "violation.ts", Line: 12, Column: 22},
		{RuleName: "prefer-effect-object", Level: "error", Message: "Avoid Object.prototype.hasOwnProperty(). Use Record.has from Effect instead.", FilePath: "violation.ts", Line: 13, Column: 22},
	})
}
