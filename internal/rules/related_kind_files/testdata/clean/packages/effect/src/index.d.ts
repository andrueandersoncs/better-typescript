export namespace Effect {
  export type Covariant<A> = (_: never) => A
  export interface Effect<A, E = never, R = never> {
    readonly "~effect/Effect": {
      readonly _A: Covariant<A>
      readonly _E: Covariant<E>
      readonly _R: Covariant<R>
    }
  }
}
export namespace Layer {
  export interface Layer<ROut, E = never, RIn = never> {
    readonly "~effect/Layer": { readonly output: ROut; readonly error: E; readonly input: RIn }
  }
}
export namespace Config {
  export interface Config<A> extends Effect.Effect<A, Error> {
    readonly "~effect/Config": A
  }
}
export namespace Schema {
  export interface Schema<A> { readonly Type: A; readonly "~effect/Schema/Schema": A }
}
export namespace Context {
  export interface Service<Identifier, Shape> extends Effect.Effect<Shape, never, Identifier> {
    readonly "~effect/Context/Service": Shape
  }
}

export namespace Schema {
  export function TaggedError<Self>(): new () => Error
  export function Class<Self>(): new () => object
}
export namespace Context {
  export function Service<Self>(): new () => object
}

export function Class<Self>(): new () => object
export function Service<Self>(): new () => object
export function TaggedError<Self>(): new () => Error
