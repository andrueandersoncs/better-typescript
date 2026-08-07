import { Tuple } from "effect"

export const emptySeamCounts = (): readonly [number, number, number] => Tuple.make(0, 0, 0)
