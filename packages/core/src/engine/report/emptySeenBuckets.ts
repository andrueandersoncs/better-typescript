import { Array, HashMap, pipe } from "effect"
import type { Detection } from "../location/detectionData.js"
import type { WiringEntry } from "../wiring/wiringEntry.js"

export const makeSeenBuckets = (entry: WiringEntry) =>
  Array.makeBy(entry.wiring.policies.length, () =>
    pipe(HashMap.empty<string, ReadonlyArray<Detection>>(), HashMap.beginMutation)
  )
