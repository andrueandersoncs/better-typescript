import { Data, Schema } from "effect"

export class PortableEnvelope extends Schema.TaggedClass<PortableEnvelope>()(
  "PortableEnvelope",
  {
    id: Schema.String,
    attempt: Schema.Number,
    active: Schema.Boolean,
    labels: Schema.Array(Schema.String),
    metadata: Schema.Struct({ owner: Schema.String, deleted: Schema.Boolean }),
    createdAt: Schema.DateFromString,
    note: Schema.optional(Schema.String)
  }
) {}

export class PortableDataModel extends Data.TaggedClass("PortableDataModel")<{
  readonly id: string
}> {}

const taggedClass = <Self>() =>
  <Tag extends string>(tag: Tag, _fields: object) =>
    class {
      static readonly _tag = tag
    }

const LocalSchema = { TaggedClass: taggedClass }

export class LocalModel extends LocalSchema.TaggedClass<LocalModel>()(
  "LocalModel",
  {}
) {}
