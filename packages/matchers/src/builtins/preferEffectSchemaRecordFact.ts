import { Array, Schema } from "effect"

const objectFactKind = Schema.Literal("object")
const tupleFactKind = Schema.Literal("tuple")
const kindLabelValues = Array.make<["an interface", "a type alias"]>("an interface", "a type alias")

const kindLabelSchema = Schema.Literals(kindLabelValues)

// PreferEffectSchemaRecordObjectFact is object evidence because construction sites drive advice.
export const PreferEffectSchemaRecordObjectFact = Schema.Struct({
  kind: objectFactKind,
  typeName: Schema.String,
  constructionFileName: Schema.String,
  kindLabel: kindLabelSchema
})

export interface PreferEffectSchemaRecordObjectFact extends Schema.Schema.Type<
  typeof PreferEffectSchemaRecordObjectFact
> {}

// PreferEffectSchemaRecordTupleFact is tuple evidence because tuple aliases need records.
export const PreferEffectSchemaRecordTupleFact = Schema.Struct({
  kind: tupleFactKind,
  typeName: Schema.String
})

export interface PreferEffectSchemaRecordTupleFact extends Schema.Schema.Type<
  typeof PreferEffectSchemaRecordTupleFact
> {}

const schemaRecordFactMembers = Array.make(
  PreferEffectSchemaRecordObjectFact,
  PreferEffectSchemaRecordTupleFact
)

// PreferEffectSchemaRecordFact unions object and tuple claims because remediation differs.
export const PreferEffectSchemaRecordFact = Schema.Union(schemaRecordFactMembers)

export type PreferEffectSchemaRecordFact = Schema.Schema.Type<typeof PreferEffectSchemaRecordFact>
