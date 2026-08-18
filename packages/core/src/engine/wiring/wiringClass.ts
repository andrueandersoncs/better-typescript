import { Data, Effect } from "effect"
import { type Advice } from "../derive/advice.js"
import type { Signal } from "../signal/data.js"
import type { WiringPolicy } from "./wiringPolicy.js"

// Wiring pairs policies with advice derivation because both halves travel together.
export class Wiring<E = never> extends Data.Class<{
  readonly policies: ReadonlyArray<WiringPolicy>
  readonly derive: (signals: ReadonlyArray<Signal>) => Effect.Effect<ReadonlyArray<Advice>, E>
}> {}
