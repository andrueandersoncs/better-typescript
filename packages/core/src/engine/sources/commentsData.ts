import { Schema } from "effect"

// SourceComment is one comment-token contract because its owners must agree on one shape.
export class SourceComment extends Schema.Class<SourceComment>("SourceComment")({
  kind: Schema.Number,
  pos: Schema.Number,
  end: Schema.Number
}) {}
