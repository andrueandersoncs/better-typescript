import { Schema } from "effect"

const optionalNameSchema = Schema.Option(Schema.String)

// EffectFnNameInspection holds node and name because findings need both together.
export const EffectFnNameInspection = Schema.Struct({
  node: Schema.Any,
  name: optionalNameSchema
})

export interface EffectFnNameInspection extends Schema.Schema.Type<typeof EffectFnNameInspection> {}
