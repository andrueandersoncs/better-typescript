import { Effect } from "effect"

export interface EffectTest {
  <A, E, R>(name: string, self: () => Effect.Effect<A, E, R>): void
  prop: <A, E, R>(name: string, arbitraries: ReadonlyArray<unknown>, self: () => Effect.Effect<A, E, R>) => void
}

export interface Test {
  (name: string, self: () => void): void
  readonly effect: EffectTest
  readonly live: EffectTest
  readonly only: Test
  prop(name: string, arbitraries: ReadonlyArray<unknown>, self: () => void): void
}

export declare const it: Test
