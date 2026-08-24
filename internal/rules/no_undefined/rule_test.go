package no_undefined

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-undefined", Level: "error", Message: "Avoid comparing values against undefined. Use Effect's Option module to model optional values, and convert nullable boundaries with Option.fromNullishOr (incoming) and Option.getOrUndefined (outgoing). When a third-party signature forces undefined on a callback, keep the callback inline or annotate it with the library's own callback type so the undefined stays in the library's declaration, not yours.", FilePath: "index.ts", Line: 2, Column: 20},
	})
}
