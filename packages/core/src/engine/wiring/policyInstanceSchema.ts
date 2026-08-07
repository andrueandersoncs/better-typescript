import { Schema } from "effect"
import { Policy } from "../policy/policyClass.js"

// policyInstanceSchema brands program Policy because wiring mixes policy stages.
export const policyInstanceSchema = Schema.instanceOf(Policy)
