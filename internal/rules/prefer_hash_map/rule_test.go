package prefer_hash_map

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferHashMapRule, []analysis.Violation{
		{RuleName: "prefer-hash-map", Level: "error", Message: "Avoid constructing a built-in Map. Use Effect's HashMap instead — for example HashMap.fromIterable([[\"a\", 1]]) or HashMap.empty(). HashMap uses Equal and Hash with structural equality by default. For reference-identity object keys, wrap each key in an Equal.equal value that compares the underlying objects with === and returns Hash.random(object) from Hash.symbol. Constructing a Map is permitted only when it is handed to a third-party API that requires one.", FilePath: "violation.ts", Line: 1, Column: 23},
	})
}
