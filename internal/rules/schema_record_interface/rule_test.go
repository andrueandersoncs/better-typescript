package schema_record_interface

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", SchemaRecordInterfaceRule, []analysis.Violation{
		{RuleName: "schema-record-interface", Level: "error", Message: "Pair a Schema.Struct record with its decoded interface. For UserSchema, export interface User extends Schema.Schema.Type<typeof UserSchema> beside the schema declaration.", FilePath: "violation.ts", Line: 3, Column: 14},
		{RuleName: "schema-record-interface", Level: "error", Message: "Pair a Schema.Struct record with its decoded interface. For UserSchema, export interface User extends Schema.Schema.Type<typeof UserSchema> beside the schema declaration.", FilePath: "violation.ts", Line: 9, Column: 14},
	})
}
