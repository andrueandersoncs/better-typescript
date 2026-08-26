import { Schema } from "effect"

export const Account = Schema.Struct({ name: Schema.String })
const nested = { group: { Nested: Schema.String } }
const { group: { Nested } } = nested
interface CustomSchemaType extends Schema.Schema<string> { readonly ast: object }
declare const customSchemaValueSchema: CustomSchemaType
const Custom = customSchemaValueSchema
