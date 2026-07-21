import { Schema } from "effect"

// SourceComment is one comment-token contract because its owners must agree on one shape.
export const SourceComment = Schema.Struct({
  kind: Schema.Number,
  pos: Schema.Number,
  end: Schema.Number
})

export interface SourceComment extends Schema.Schema.Type<typeof SourceComment> {}
