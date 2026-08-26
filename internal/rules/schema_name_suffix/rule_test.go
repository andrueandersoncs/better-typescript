package schema_name_suffix

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "schema-name-suffix", Level: "error", Message: "Account is an Effect Schema const without a Schema suffix. Rename it to AccountSchema and update its references. Name the decoded interface Account and extend Schema.Schema.Type<typeof AccountSchema>.", FilePath: "src/violation.ts", Line: 3, Column: 14},
		{RuleName: "schema-name-suffix", Level: "error", Message: "User is an Effect Schema const without a Schema suffix. Rename it to UserSchema and update its references. Name the decoded interface User and extend Schema.Schema.Type<typeof UserSchema>.", FilePath: "src/violation.ts", Line: 5, Column: 9},
		{RuleName: "schema-name-suffix", Level: "error", Message: "Other is an Effect Schema const without a Schema suffix. Rename it to OtherSchema and update its references. Name the decoded interface Other and extend Schema.Schema.Type<typeof OtherSchema>.", FilePath: "src/violation.ts", Line: 7, Column: 8},
		{RuleName: "schema-name-suffix", Level: "error", Message: "Custom is an Effect Schema const without a Schema suffix. Rename it to CustomSchema and update its references. Name the decoded interface Custom and extend Schema.Schema.Type<typeof CustomSchema>.", FilePath: "src/violation.ts", Line: 10, Column: 7},
	})
}

func TestRuleV4(t *testing.T) {
	ruletest.Assert(t, "testdata_v4", Rule, []analysis.Violation{
		{RuleName: "schema-name-suffix", Level: "error", Message: "Account is an Effect Schema const without a Schema suffix. Rename it to AccountSchema and update its references. Name the decoded interface Account and extend Schema.Schema.Type<typeof AccountSchema>.", FilePath: "src/violation.ts", Line: 3, Column: 14},
		{RuleName: "schema-name-suffix", Level: "error", Message: "Nested is an Effect Schema const without a Schema suffix. Rename it to NestedSchema and update its references. Name the decoded interface Nested and extend Schema.Schema.Type<typeof NestedSchema>.", FilePath: "src/violation.ts", Line: 5, Column: 18},
		{RuleName: "schema-name-suffix", Level: "error", Message: "Custom is an Effect Schema const without a Schema suffix. Rename it to CustomSchema and update its references. Name the decoded interface Custom and extend Schema.Schema.Type<typeof CustomSchema>.", FilePath: "src/violation.ts", Line: 8, Column: 7},
	})
}
