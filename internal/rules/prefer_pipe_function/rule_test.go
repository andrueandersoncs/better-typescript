package prefer_pipe_function

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferPipeFunctionRule, []analysis.Violation{
		{RuleName: "prefer-pipe-function", Level: "error", Message: "Avoid calling .pipe() as a method. Import pipe from \"effect\" and call it as a standalone function: pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2).", FilePath: "violation.ts", Line: 2, Column: 40},
	})
}
