import type { Tag } from "./Context.js"
import type { Exit } from "./Exit.js"
import type { Scope } from "./Scope.js"

export interface Effect<A, E = never, R = never> {
  readonly _A: A
  readonly _E: E
  readonly _R: R
  [Symbol.iterator](): Generator<Effect<A, E, R>, A, unknown>
}

export declare const succeed: <A>(value: A) => Effect<A>
export declare const provideService: <A, E, R, I, S>(
  self: Effect<A, E, R>,
  tag: Tag<I, S>,
  service: S
) => Effect<A, E, Exclude<R, I>>
export declare const acquireRelease: <A, E, R>(
  acquire: Effect<A, E, R>,
  release: (resource: A, exit: Exit<A, E>) => Effect<void>
) => Effect<A, E, R | Scope>
export declare const gen: <A, E, R>(
  f: () => Generator<Effect<unknown, E, R>, A, unknown>
) => Effect<A, E, R>
