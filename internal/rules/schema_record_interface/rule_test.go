package schema_record_interface

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", SchemaRecordInterfaceRule, []analysis.Violation{
		{RuleName: "schema-record-interface", Level: "error", Message: "Pair a Schema.Struct record with its same-name interface. Export the decoded interface beside the Schema.Struct declaration.", FilePath: "violation.ts", Line: 2, Column: 14},
	})
}
