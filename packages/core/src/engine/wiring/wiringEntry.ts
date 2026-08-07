import { Array, Data } from "effect"
import type { Wiring } from "./wiringClass.js"

// WiringEntry pairs a file scope with its wiring because both sides share that.
export class WiringEntry extends Data.Class<{
  readonly files: Array.NonEmptyReadonlyArray<string>
  readonly wiring: Wiring
}> {}
