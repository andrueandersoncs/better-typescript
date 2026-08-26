import { Schema } from "effect"

export const Account = Schema.Struct({ name: Schema.String() })
const schemas = { User: Schema.String() }
const { User } = schemas
const schemaList = [Schema.String()] as const
const [Other] = schemaList
interface CustomSchemaType extends Schema.Schema<string> { readonly ast: object }
declare const customSchemaValueSchema: CustomSchemaType
const Custom = customSchemaValueSchema
