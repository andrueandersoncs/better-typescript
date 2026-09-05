package prefer_hash_map

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferHashMapRule, []analysis.Violation{
		{RuleName: "prefer-hash-map", Level: "error", Message: "Avoid constructing a built-in Map. Use Effect's HashMap instead — for example HashMap.fromIterable([[\"a\", 1]]) or HashMap.empty(). HashMap uses Equal and Hash with structural equality by default. For reference-identity object keys, retain one Equal.byReference wrapper and use that same wrapper for every insertion and lookup. Each call creates a new wrapper, so wrapping the raw object again does not preserve native-identity lookup. If a public contract must accept raw object identities, moving to HashMap changes that contract; do not use Equal.byReferenceUnsafe as a general replacement. Constructing a Map is exempt when it is passed directly, or through a variable, to a resolved call declared outside the current source file; that includes first-party modules, not only third-party APIs.", FilePath: "violation.ts", Line: 1, Column: 23},
	})
}
