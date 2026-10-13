package require_command_name_consistency

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

const commandHelp = "Rename away from the command verb, or implement a true command with a void or Effect.void result."

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "require-command-name-consistency", Level: "error", Message: "saveUser claims the command save, but its result and body do not provide command evidence. " + commandHelp, FilePath: "index.ts", Line: 8, Column: 7},
		{RuleName: "require-command-name-consistency", Level: "error", Message: "saveAccount claims the command save, but its result and body do not provide command evidence. " + commandHelp, FilePath: "index.ts", Line: 18, Column: 7},
		{RuleName: "require-command-name-consistency", Level: "error", Message: "getUser is a void command named like an accessor, projection, or result, not a command. Rename with command language such as save, write, send, publish, set, update, remove, or delete.", FilePath: "index.ts", Line: 19, Column: 7},
	})
}
