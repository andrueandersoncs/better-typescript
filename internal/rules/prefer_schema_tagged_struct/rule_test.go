package prefer_schema_tagged_struct

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata", PreferSchemaTaggedStructRule, []analysis.Violation{
		{RuleName: "prefer-schema-tagged-struct", Level: "error", Message: "Prefer Schema.TaggedStruct when every field has a portable wire representation. This Data.TaggedClass contains only wire-safe structural fields. When it crosses a reusable boundary, define it as a Schema-suffixed Schema.TaggedStruct const and a decoded interface named without the suffix. Compose multiple boundary variants with Schema.TaggedUnion. Keep Data.TaggedClass for process-bound values such as streams, effects, functions, compiler objects, and live handles, and use Data.TaggedEnum for internal workflow decisions or state. Use Schema.TaggedErrorClass only for typed errors.", FilePath: "violation.ts", Line: 2, Column: 14},
	})
}
