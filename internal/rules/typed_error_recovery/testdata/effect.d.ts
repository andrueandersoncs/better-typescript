declare module "effect" {
  export namespace Effect { export type Effect<A, E = never, R = never> = { readonly _A: A; readonly _E: E; readonly _R: R } }
  export const Effect: { catchCause<A, E>(self: Effect.Effect<A, E>, handler: (cause: unknown) => Effect.Effect<A>): Effect.Effect<A>; succeed<A>(value: A): Effect.Effect<A> }
}
