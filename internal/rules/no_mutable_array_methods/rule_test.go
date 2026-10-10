package no_mutable_array_methods

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	violation := func(method string, line int) analysis.Violation {
		return analysis.Violation{RuleName: "no-mutable-array-methods", Level: "error", Message: "Avoid mutating collections with " + method + "(). " + help, FilePath: "src/cases.ts", Line: line, Column: 1}
	}
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		violation("Array.prototype.push", 2),
		violation("Map.prototype.set", 6),
		violation("Map.prototype.delete", 7),
		violation("Map.prototype.clear", 8),
		violation("Set.prototype.add", 10),
		violation("WeakMap.prototype.set", 12),
		violation("Uint8Array.prototype.fill", 14),
		violation("Uint8Array.prototype.set", 15),
		violation("Map.prototype.set", 17),
	})
}
