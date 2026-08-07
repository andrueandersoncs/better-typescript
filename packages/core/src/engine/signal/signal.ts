import { Array, Option, Struct, pipe, flow } from "effect"
import type { Detection } from "../location/detectionData.js"
import { strictEqual } from "../equivalence/strictEqual.js"
import { Signal } from "./data.js"

// Lookup stays on the materialized batch because derive helpers need random access to siblings.
export const signalOf =
  (signals: ReadonlyArray<Signal>) =>
  (name: string): ReadonlyArray<Detection> => {
    const hasName = flow(Struct.get<Signal, "name">("name"), strictEqual(name))

    return pipe(
      Array.findFirst(signals, hasName),
      Option.map(Struct.get("detections")),
      Option.getOrElse(Array.empty<Detection>)
    )
  }
