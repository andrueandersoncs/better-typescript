import { Schema } from "effect"
interface User { nickname?: string }
const User = Schema.Struct({ nickname: Schema.optional(Schema.String) })
