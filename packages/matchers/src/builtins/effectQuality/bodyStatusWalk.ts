import { Schema } from "effect"

// BodyStatusWalk tracks body-before-status order because that order is the rule subject.
export const BodyStatusWalk = Schema.Struct({
  sawBodyRead: Schema.Boolean,
  sawStatusBefore: Schema.Boolean
})

export interface BodyStatusWalk extends Schema.Schema.Type<typeof BodyStatusWalk> {}
