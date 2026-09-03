import { Schema } from "effect"

export const BookSchema = Schema.Struct({
  title: Schema.String,
  pageCount: Schema.Number,
})
export interface Book extends Schema.Schema.Type<typeof BookSchema> {}
export const decodeBook = Schema.decodeUnknownSync(BookSchema)

namespace Fake {
  export namespace Schema {
    export type Type<Value> = Value
  }
}
interface LocalBook extends Fake.Schema.Type<{ readonly title: string }> {}
const localBook: LocalBook = { title: "local" }
void localBook
