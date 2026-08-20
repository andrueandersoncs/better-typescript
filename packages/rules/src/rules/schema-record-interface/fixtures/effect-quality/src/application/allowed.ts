import { Config, Schema } from "effect"

const allowedOptionalKey = Schema.optionalKey(Schema.String)
const allowedLogLevel = Config.string("LOG_LEVEL")

export const allowed = { allowedOptionalKey, allowedLogLevel }
