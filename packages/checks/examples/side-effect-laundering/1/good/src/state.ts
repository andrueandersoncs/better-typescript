import { Array } from "effect"

declare const values: ReadonlyArray<number>
export const addValue = (value: number): ReadonlyArray<number> => Array.append(values, value)
export const removeValue = (): ReadonlyArray<number> => Array.dropRight(values, 1)
