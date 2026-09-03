package no_first_party_root_class

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	const diagnostic = "Avoid unsupported first-party classes. Use a class only when it extends another class. Keep methods static unless they declare override; private methods are not allowed. Replace root classes with functions, grouping them in a plain object when the namespace is part of the API."
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 2, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 9, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 10, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 11, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 14, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 17, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 21, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 25, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 30, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 35, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 39, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 43, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 46, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 49, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 58, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 64, Column: 14},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 73, Column: 21},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 74, Column: 19},
		{RuleName: "no-first-party-root-class", Level: "error", Message: diagnostic, FilePath: "src/cases.ts", Line: 88, Column: 14},
	})
}
