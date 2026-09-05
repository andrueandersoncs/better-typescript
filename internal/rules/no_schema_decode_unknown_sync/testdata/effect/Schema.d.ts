export interface Constraint {
  readonly Type: unknown
  readonly DecodingServices: unknown
}

export interface ConstraintDecoder<T, RD = never> extends Constraint {
  readonly Type: T
  readonly DecodingServices: RD
}

export declare function decodeUnknownSync<S extends ConstraintDecoder<unknown>>(schema: S): (input: unknown) => S["Type"]
