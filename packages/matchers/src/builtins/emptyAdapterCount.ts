import { Tuple } from "effect"

export const emptyAdapterCount = (): readonly [number, number] => Tuple.make(0, 0)
