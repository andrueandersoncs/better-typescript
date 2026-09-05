export interface Effect<A, E = never, R = never> {
  readonly _A?: A
  readonly _E?: E
  readonly _R?: R
}

export interface Schema<A> {
  readonly Type: A
}

export type Json = null | number | boolean | string | readonly Json[] | { readonly [key: string]: Json }

export declare const decodeUnknownEffect: <A>(schema: Schema<A>) => (input: unknown) => Effect<A>
