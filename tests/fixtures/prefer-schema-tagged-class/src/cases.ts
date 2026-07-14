import { Data } from "effect"

export class PortableEvent extends Data.TaggedClass("PortableEvent")<{
  readonly id: string
  readonly attempt: number
  readonly active: boolean
}> {}

type PortablePayload = {
  readonly labels: ReadonlyArray<string>
  readonly metadata: {
    readonly owner: string
    readonly deletedAt: number | null
  }
}

export class PortableEnvelope extends Data.TaggedClass("PortableEnvelope")<
  PortablePayload
> {}
