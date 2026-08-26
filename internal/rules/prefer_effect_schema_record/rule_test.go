package prefer_effect_schema_record

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-schema-record", Level: "error", Message: "Avoid declaring Coordinate as a tuple type alias. Replace a constructed tuple alias with a named Effect schema record, for example export const ExampleSchema = Schema.Struct({ myString: Schema.String, myNumber: Schema.Number }); export interface Example extends Schema.Schema.Type<typeof ExampleSchema> {}. Keep a tuple only when its positions are inherently meaningful; process-bound runtime values remain boundary types or explicit runtime data.", FilePath: "violation.ts", Line: 1, Column: 6},
	})
}
