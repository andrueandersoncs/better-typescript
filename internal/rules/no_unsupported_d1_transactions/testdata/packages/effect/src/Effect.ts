import type { Pipeable } from "effect/Pipeable"

export interface Effect<A, E = never, R = never> extends Pipeable {
  readonly "~effect/Effect": readonly [A, E, R]
}
