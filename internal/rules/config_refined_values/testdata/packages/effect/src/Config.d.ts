import type * as Effect from "./Effect.js"
import type * as Schema from "./Schema.js"

export interface Config<A> {
  readonly Type: A
  pipe<B>(f: (self: Config<A>) => B): B
}

export type Path = ReadonlyArray<string>

export declare function String(name?: string): Config<string>
export declare function URL(name?: string): Config<globalThis.URL>
export declare function schema<T>(codec: Schema.ConstraintCodec<T, unknown>, path?: string | Path): Config<T>

export declare const map: {
  <A, B>(f: (value: A) => B): (self: Config<A>) => Config<B>
  <A, B>(self: Config<A>, f: (value: A) => B): Config<B>
};

export declare class ConfigError {
  constructor(cause: Schema.SchemaError)
}

export declare const mapEffect: {
  <A, B>(f: (value: A) => Effect.Effect<B, ConfigError>): (self: Config<A>) => Config<B>
  <A, B>(self: Config<A>, f: (value: A) => Effect.Effect<B, ConfigError>): Config<B>
};
