package no_reexports

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	violation := func(file string, line, column int) analysis.Violation {
		return analysis.Violation{RuleName: "no-reexports", Level: "error", Message: "Do not re-export imported bindings. Import the dependency where it is used and expose a locally defined public interface instead.", FilePath: file, Line: line, Column: column}
	}
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		violation("alias.ts", 5, 10),
		violation("alias.ts", 5, 16),
		violation("default.ts", 2, 1),
		violation("export-import.ts", 1, 1),
		violation("index.ts", 1, 10),
		violation("require.ts", 2, 1),
	})
}
