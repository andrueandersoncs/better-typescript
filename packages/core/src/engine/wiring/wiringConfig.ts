import type { WiringEntry } from "./wiringEntry.js"

// WiringConfig is the ordered entry boundary because loading preserves order.
export type WiringConfig<E = never> = ReadonlyArray<WiringEntry<E>>
