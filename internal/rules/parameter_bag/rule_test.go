package parameter_bag

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "parameter-bag", Level: "error", Message: "MethodParams is constructed only to cross the run call seam. Remove or deepen the function seam, reuse existing domain values, or make this model a genuine command with independent semantics. Do not explode it into primitive parameters or an anonymous object type.", FilePath: "consumer.ts", Line: 8, Column: 18},
		{RuleName: "parameter-bag", Level: "error", Message: "TaskCommand is constructed only to cross the runTask call seam. Remove or deepen the function seam, reuse existing domain values, or make this model a genuine command with independent semantics. Do not explode it into primitive parameters or an anonymous object type.", FilePath: "index.ts", Line: 3, Column: 28},
		{RuleName: "parameter-bag", Level: "error", Message: "BookFields is constructed only to cross the Struct call seam. Remove or deepen the function seam, reuse existing domain values, or make this model a genuine command with independent semantics. Do not explode it into primitive parameters or an anonymous object type.", FilePath: "index.ts", Line: 19, Column: 38},
	})
}
