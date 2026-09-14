package no_manual_effect_error_tag

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-manual-effect-error-tag", Level: "error", Message: "Use Effect.catchTag or Effect.catchTags. Do not manually discriminate a tagged error in a broad Effect catch handler.", FilePath: "cases.ts", Line: 2, Column: 25},
		{RuleName: "no-manual-effect-error-tag", Level: "error", Message: "Use Effect.catchReason or Effect.catchReasons. Do not manually discriminate a tagged `reason` in a broad Effect catch handler.", FilePath: "cases.ts", Line: 3, Column: 28},
	})
}
