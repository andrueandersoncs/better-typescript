package no_mutation

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	violation := func(line, column int) analysis.Violation {
		return analysis.Violation{RuleName: "no-mutation", Level: "error", Message: message.Description + " " + message.Help, FilePath: "src/cases.ts", Line: line, Column: column}
	}
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		violation(3, 1),
		violation(6, 15),
		violation(7, 13),
		violation(8, 23),
		violation(12, 1),
		violation(16, 3),
		violation(17, 8),
	})
}
