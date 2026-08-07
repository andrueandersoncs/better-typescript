import { Array, Data } from "effect"
import type { Wiring } from "./wiringClass.js"

// WiringEntryInput is the authoring entry bag because defineConfig owns construction.
export class WiringEntryInput extends Data.Class<{
  readonly files: Array.NonEmptyReadonlyArray<string>
  readonly wiring: Pick<Wiring, "policies" | "derive">
}> {}
