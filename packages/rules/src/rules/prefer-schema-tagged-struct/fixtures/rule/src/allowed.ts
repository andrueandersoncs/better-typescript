import { Data, Schema, Stream } from "effect"

export class RuntimeTask extends Data.TaggedClass("RuntimeTask")<{
  readonly stream: Stream.Stream<string>
}> {}

export class RuntimeCallback extends Data.TaggedClass("RuntimeCallback")<{
  readonly run: () => void
}> {}

export class UnresolvedPayload extends Data.TaggedClass("UnresolvedPayload")<{
  readonly payload: unknown
}> {}

export const PortableSchema = Schema.TaggedStruct("PortableSchema", {
  id: Schema.String
})
export interface PortableSchema extends Schema.Schema.Type<typeof PortableSchema> {}

const taggedClass = <Tag extends string>(tag: Tag) =>
  class {
    readonly _tag = tag
  }

const LocalData = { TaggedClass: taggedClass }

export class LocalModel extends LocalData.TaggedClass("LocalModel") {}
