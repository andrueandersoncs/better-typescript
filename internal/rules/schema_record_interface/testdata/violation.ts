import { Schema } from "effect"

export const UserSchema = Schema.Struct({ id: Schema.String })
namespace PairedScope {
  export const UserSchema = Schema.Struct({ id: Schema.String })
  export interface User extends Schema.Schema.Type<typeof UserSchema> {}
}

export const AccountSchema = Schema.Struct({ id: Schema.String })
namespace FakePair {
  export namespace Schema { export namespace Schema { export interface Type<Value> {} } }
  export interface Account extends Schema.Schema.Type<typeof AccountSchema> {}
}
