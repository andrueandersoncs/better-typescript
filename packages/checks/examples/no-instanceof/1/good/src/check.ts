import { Schema } from "effect"

const NotFoundError = Schema.Struct({
  _tag: Schema.Literal("NotFoundError")
})

export const recover = (fallback: string) => (error: unknown) => {
  if (Schema.is(NotFoundError)(error)) {
    return fallback
  }
}
