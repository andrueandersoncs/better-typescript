import { Schema } from "effect"

export const UserSchema = Schema.Struct({ name: Schema.String() })
export interface User extends Schema.Schema.Type<typeof UserSchema> {}

const schemas = { UserSchema: Schema.String() }
const { UserSchema: AliasSchema } = schemas
const schemaList = [Schema.String()] as const
const [OtherSchema] = schemaList

const Local = { ast: {}, Type: "local" }
const FakePick: Pick<Schema.Schema<string>, "ast"> = { ast: {} }
declare const FakeFragment: Pick<Schema.Schema<string>, "ast" | typeof Schema.TypeId>
const callback = ({ Parameter }: { Parameter: Schema.Schema<string> }) => Parameter
const count = 1
let Mutable = UserSchema
void AliasSchema
void OtherSchema
void Local
void FakePick
void FakeFragment
void callback
void count
void Mutable
