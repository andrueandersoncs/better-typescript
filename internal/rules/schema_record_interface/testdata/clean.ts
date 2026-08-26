import { Equivalence, Schema } from "effect"
export const UserSchema = Schema.Struct({ id: Schema.String })
export interface User extends Schema.Schema.Type<typeof UserSchema> {}

function localSchemaCall(Schema: { Struct: (fields: object) => unknown }) {
  const LocalSchema = Schema.Struct({ id: "local" })
  return LocalSchema
}
void localSchemaCall

const EquivalenceSchema = Equivalence.Struct({ id: (left: number, right: number) => left === right })
void EquivalenceSchema
