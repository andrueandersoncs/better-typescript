import * as Schema from "effect/Schema"

function inner(): number { return 1 }
function outer(value: number): number { return value }
const violation = outer(inner())
const value = inner()
const clean = outer(value)
const checked = Schema.String.check(Schema.isUUID(7))
const nullableStrings = Schema.NullOr(Schema.Array(Schema.String))
const tagged = Schema.TaggedUnion({ Value: { values: Schema.Array(Schema.String) } })
void violation
void clean
void checked
void nullableStrings
void tagged
