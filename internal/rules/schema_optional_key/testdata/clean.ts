import { Schema } from "effect"
interface User { nickname?: string | undefined }
const User = Schema.Struct({ nickname: Schema.optional(Schema.String) })

declare const key: unique symbol
interface Computed { [key]?: string }
const Computed = Schema.Struct({ [key]: Schema.optional(Schema.String) })
