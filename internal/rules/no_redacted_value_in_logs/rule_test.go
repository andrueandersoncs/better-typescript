package no_redacted_value_in_logs

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-redacted-value-in-logs", Level: "error", Message: "Do not reveal a Redacted value in logs. Log the Redacted value or safe metadata instead of Redacted.value.", FilePath: "violation.ts", Line: 6, Column: 16},
		{RuleName: "no-redacted-value-in-logs", Level: "error", Message: "Do not reveal a Redacted value in logs. Log the Redacted value or safe metadata instead of Redacted.value.", FilePath: "violation.ts", Line: 7, Column: 40},
		{RuleName: "no-redacted-value-in-logs", Level: "error", Message: "Do not reveal a Redacted value in logs. Log the Redacted value or safe metadata instead of Redacted.value.", FilePath: "violation.ts", Line: 8, Column: 16},
		{RuleName: "no-redacted-value-in-logs", Level: "error", Message: "Do not reveal a Redacted value in logs. Log the Redacted value or safe metadata instead of Redacted.value.", FilePath: "violation.ts", Line: 9, Column: 29},
		{RuleName: "no-redacted-value-in-logs", Level: "error", Message: "Do not reveal a Redacted value in logs. Log the Redacted value or safe metadata instead of Redacted.value.", FilePath: "violation.ts", Line: 10, Column: 12},
		{RuleName: "no-redacted-value-in-logs", Level: "error", Message: "Do not reveal a Redacted value in logs. Log the Redacted value or safe metadata instead of Redacted.value.", FilePath: "violation.ts", Line: 11, Column: 8},
	})
}
