package no_first_party_schema_declare

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", NoFirstPartySchemaDeclareRule, []analysis.Violation{
		{RuleName: "no-first-party-schema-declare", Level: "error", Message: "Avoid Schema.declare for the first-party structural type \"User\". Schema.declare is for third-party integrations and non-parametric opaque or branded types validated by a type guard. For structural models you own, define a Schema.Struct const with a Schema suffix plus a decoded interface — for example export const MyTypeSchema = Schema.Struct({ ... }); export interface MyType extends Schema.Schema.Type<typeof MyTypeSchema> {} — which gives you validation, encoding, and decoding for free.", FilePath: "src/violation.ts", Line: 4, Column: 27},
	})
}
