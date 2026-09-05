package no_schema_opaque_instance_members

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	const diagnostic = "Avoid instance members on a Schema.Opaque subclass. Schema.Opaque over Schema.Struct returns the carrier's values rather than instances of this class, so inherited makers do not install instance fields, methods, accessors, or constructor behavior. Keep helpers static, or use Schema.Class when values must be instances."
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "no-schema-opaque-instance-members", Level: "error", Message: diagnostic, FilePath: "violation.ts", Line: 5, Column: 3},
		{RuleName: "no-schema-opaque-instance-members", Level: "error", Message: diagnostic, FilePath: "violation.ts", Line: 9, Column: 3},
		{RuleName: "no-schema-opaque-instance-members", Level: "error", Message: diagnostic, FilePath: "violation.ts", Line: 13, Column: 3},
		{RuleName: "no-schema-opaque-instance-members", Level: "error", Message: diagnostic, FilePath: "violation.ts", Line: 17, Column: 3},
		{RuleName: "no-schema-opaque-instance-members", Level: "error", Message: diagnostic, FilePath: "violation.ts", Line: 21, Column: 3},
		{RuleName: "no-schema-opaque-instance-members", Level: "error", Message: diagnostic, FilePath: "violation.ts", Line: 25, Column: 3},
		{RuleName: "no-schema-opaque-instance-members", Level: "error", Message: diagnostic, FilePath: "violation.ts", Line: 31, Column: 3},
		{RuleName: "no-schema-opaque-instance-members", Level: "error", Message: diagnostic, FilePath: "violation.ts", Line: 36, Column: 3},
	})
}

func TestUninitializedFieldWithoutDefineSemantics(t *testing.T) {
	ruletest.Assert(t, "testdata_no_define", Rule, []analysis.Violation{})
}
