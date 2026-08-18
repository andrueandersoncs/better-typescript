import { Struct, flow } from "effect"
import { strictEqual } from "../equivalence.js"

export const hasSingleElement = flow(
  Struct.get<ReadonlyArray<unknown>, "length">("length"),
  strictEqual(1)
)
