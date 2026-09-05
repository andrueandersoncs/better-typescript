package discarded_effect_operation

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "discarded-effect-operation", Level: "error", Message: "Do not discard an Effect operation inside an Effect generator. Yield, return, or compose the Effect so the generator executes it.", FilePath: "index.ts", Line: 7, Column: 3},
		{RuleName: "discarded-effect-operation", Level: "error", Message: "Do not discard an Effect operation inside an Effect generator. Yield, return, or compose the Effect so the generator executes it.", FilePath: "index.ts", Line: 16, Column: 3},
		{RuleName: "discarded-effect-operation", Level: "error", Message: "Do not discard an Effect operation inside an Effect generator. Yield, return, or compose the Effect so the generator executes it.", FilePath: "index.ts", Line: 21, Column: 3},
		{RuleName: "discarded-effect-operation", Level: "error", Message: "Do not discard an Effect operation inside an Effect generator. Yield, return, or compose the Effect so the generator executes it.", FilePath: "index.ts", Line: 26, Column: 3},
	})
}
