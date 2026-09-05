import type * as Schema from "effect/Schema"

export interface DurableQueue<Payload extends Schema.Fields> {
  readonly payload: Payload
}

export declare const make: <Payload extends Schema.Fields>(options: {
  readonly name: string
  readonly payload: Payload
  readonly idempotencyKey: (payload: Schema.StructType<Payload>) => string
}) => DurableQueue<Payload>
