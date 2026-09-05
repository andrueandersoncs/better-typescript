import type * as Schema from "effect/Schema"

export interface Rpc<Payload extends Schema.Fields> {
  readonly payload: Payload
}

export declare const make: <Payload extends Schema.Fields>(
  tag: string,
  options?: {
    readonly payload?: Payload
    readonly primaryKey?: (payload: Schema.StructType<Payload>) => string
  },
) => Rpc<Payload>
