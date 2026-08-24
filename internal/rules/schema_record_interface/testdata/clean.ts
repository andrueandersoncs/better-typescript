import { Schema } from "effect"
export const User = Schema.Struct({ id: Schema.String })
export interface User extends Schema.Schema.Type<typeof User> {}
