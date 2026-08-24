import { Schema } from "effect"
interface User { nickname?: string | undefined }
const User = Schema.Struct({ nickname: Schema.optional(Schema.String) })
