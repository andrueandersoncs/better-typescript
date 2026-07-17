import { Array, pipe } from "effect"
import { Array as Arr } from "effect"
import * as Effect from "effect"
import * as EffectArray from "effect/Array"

const values: ReadonlyArray<number> = [1, 2, 3, 4]
const isEven = (value: number): boolean => value % 2 === 0

export const direct = Array.filter(values, isEven).length // ~detect 23
export const aliased = Arr.filter(values, isEven).length // ~detect 24
export const namespace = Effect.Array.filter(values, isEven).length // ~detect 26
export const subpath = EffectArray.filter(values, isEven).length // ~detect 24
export const curried = Array.filter<number>(isEven)(values).length // ~detect 24
export const piped = pipe(values, Array.filter(isEven)).length // ~detect 22
export const asserted = (Array.filter(values, isEven) as ReadonlyArray<number>).length // ~detect 25
