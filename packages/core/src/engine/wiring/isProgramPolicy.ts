import { Schema } from "effect"
import { policyInstanceSchema } from "./policyInstanceSchema.js"

export const isProgramPolicy = Schema.is(policyInstanceSchema)
