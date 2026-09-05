import type * as Effect from "./Effect.js"

export interface Constraint {
  readonly Type: unknown
  readonly DecodingServices: unknown
}

export interface ConstraintCodec<T, E = T, RD = never> extends Constraint {
  readonly Type: T
  readonly Encoded: E
  readonly DecodingServices: RD
}

export interface SchemaValue<T, E> extends ConstraintCodec<T, E> {
  make(input: T): T
}

export declare class SchemaError {
  readonly _tag: "SchemaError"
}

export declare const URL: ConstraintCodec<globalThis.URL, unknown>
export declare const URLFromString: SchemaValue<globalThis.URL, string>
export declare function decodeUnknownEffect<S extends Constraint>(schema: S): (input: unknown) => Effect.Effect<S["Type"], SchemaError, S["DecodingServices"]>
