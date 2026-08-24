package no_duplicate_function_names

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoDuplicateFunctionNamesRule, []analysis.Violation{
		{RuleName: "no-duplicate-function-names", Level: "error", Message: "Avoid declaring the top-level function shared with an identical signature in multiple files. shared is declared with the same signature in src/violation.ts, which makes the copies semantic duplicates. Extract one shared implementation into a module scoped to its domain and import it from every file that uses it. Name the module after the concept it serves (ts.Node helpers belong in ts-node.ts), not a generic lib.ts or utils.ts. Same-name functions over different signatures (user.ts#make, account.ts#make) are module vocabulary, not duplicates.", FilePath: "src/duplicate.ts", Line: 2, Column: 10},
		{RuleName: "no-duplicate-function-names", Level: "error", Message: "Avoid declaring the top-level function shared with an identical signature in multiple files. shared is declared with the same signature in src/duplicate.ts, which makes the copies semantic duplicates. Extract one shared implementation into a module scoped to its domain and import it from every file that uses it. Name the module after the concept it serves (ts.Node helpers belong in ts-node.ts), not a generic lib.ts or utils.ts. Same-name functions over different signatures (user.ts#make, account.ts#make) are module vocabulary, not duplicates.", FilePath: "src/violation.ts", Line: 2, Column: 10},
	})
}
