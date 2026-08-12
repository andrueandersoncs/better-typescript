import { Schema } from "effect"

const optionalTag = Schema.optional(Schema.String)

// PreferEffectSchemaConstructorFact records optional tags because tagged advice differs.
export const PreferEffectSchemaConstructorFact = Schema.Struct({
  tag: optionalTag
})

export interface PreferEffectSchemaConstructorFact extends Schema.Schema.Type<
  typeof PreferEffectSchemaConstructorFact
> {}
