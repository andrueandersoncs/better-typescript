import { Schema } from "effect"
import { policyInstanceSchema } from "./policyInstanceSchema.js"

// ProgramPolicySlot indexes a program Policy in wiring because collection is cross-entry.
export const ProgramPolicySlot = Schema.Struct({
  wiringIndex: Schema.Number,
  policyIndex: Schema.Number,
  policy: policyInstanceSchema
})

export interface ProgramPolicySlot extends Schema.Schema.Type<typeof ProgramPolicySlot> {}
