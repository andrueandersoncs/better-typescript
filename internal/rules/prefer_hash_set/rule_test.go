package prefer_hash_set

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferHashSetRule, []analysis.Violation{
		{RuleName: "prefer-hash-set", Level: "error", Message: "Avoid constructing a built-in Set. Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or HashSet.empty(). HashSet uses Equal and Hash with structural equality by default. For reference-identity object members, retain one Equal.byReference wrapper and use that same wrapper for every insertion and membership check. Each call creates a new wrapper, so wrapping the raw object again does not preserve native-identity membership. If a public contract must accept raw object identities, moving to HashSet changes that contract; do not use Equal.byReferenceUnsafe as a general replacement. Constructing a Set is exempt when it is passed directly, or through a variable, to a resolved call declared outside the current source file; that includes first-party modules, not only third-party APIs.", FilePath: "violation.ts", Line: 1, Column: 23},
	})
}
