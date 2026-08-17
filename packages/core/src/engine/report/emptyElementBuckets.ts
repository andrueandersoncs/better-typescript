import { Array, MutableList } from "effect"
import type { Detection } from "../location/detectionData.js"
import type { WiringEntry } from "../wiring/wiringEntry.js"

export const makeElementBuckets = (entry: WiringEntry) =>
  Array.makeBy(entry.wiring.policies.length, () => MutableList.make<Detection>())
