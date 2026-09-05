import { Effect } from "effect"

export interface EffectTest {
  <A, E, R>(name: string, self: () => Effect.Effect<A, E, R>): void
}

export interface Test {
  readonly effect: EffectTest
  readonly live: EffectTest
}

export declare const it: Test
