package prefer_hash_set

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferHashSetRule, []analysis.Violation{
		{RuleName: "prefer-hash-set", Level: "error", Message: "Avoid constructing a built-in Set. Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or HashSet.empty(). HashSet uses Equal and Hash with structural equality by default. For reference-identity object members, wrap each value in an Equal.equal value that compares the underlying objects with === and returns Hash.random(object) from Hash.symbol. Constructing a Set is permitted only when it is handed to a third-party API that requires one.", FilePath: "violation.ts", Line: 1, Column: 23},
	})
}
