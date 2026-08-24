package require_command_name_consistency

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-command-name-consistency", Level: "error", Message: "saveUser claims the command save, but its result and body do not provide command evidence. Rename away from the command verb, or implement a true command with a void or Effect.void result.", FilePath: "index.ts", Line: 1, Column: 7},
	})
}
