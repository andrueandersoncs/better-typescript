package prefer_effect_schema_class

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", Rule, []analysis.Violation{
		{RuleName: "prefer-effect-schema-class", Level: "error", Message: "Avoid declaring Coordinate as a tuple type alias. Replace a constructed tuple alias with a named Effect Schema class with named fields, for example export class Example extends Schema.Class<Example>(\"Example\")({ myString: Schema.String, myNumber: Schema.Number }) {}. Keep a tuple only when its positions are inherently meaningful; process-bound runtime values remain boundary types or explicit runtime data.", FilePath: "violation.ts", Line: 1, Column: 6},
		{RuleName: "prefer-effect-schema-class", Level: "error", Message: "Avoid declaring User as an interface when this project constructs its values. Object literals of this shape are built in violation.ts, so User is a data model rather than a boundary type. Define it as an Effect Schema class — export class User extends Schema.Class<User>(\"User\")({ ... }) {}. Construct trusted values with User.make({ ... }) and decode unknown input at the boundary. Use Schema.TaggedClass for tagged variants and Schema.TaggedErrorClass only for typed errors; keep process-bound runtime values as boundary types or explicit runtime data.", FilePath: "violation.ts", Line: 3, Column: 11},
	})
}
