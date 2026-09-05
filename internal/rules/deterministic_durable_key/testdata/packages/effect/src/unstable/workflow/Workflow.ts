import type * as Schema from "effect/Schema"

export interface Workflow<Payload extends Schema.Fields> {
  readonly payload: Payload
}

export declare const make: <Payload extends Schema.Fields>(
  tag: string,
  options: {
    readonly payload: Payload
    readonly idempotencyKey: (payload: Schema.StructType<Payload>) => string
  },
) => Workflow<Payload>
