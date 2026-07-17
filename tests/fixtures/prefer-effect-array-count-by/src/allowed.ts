import { Array, pipe } from "effect"

const values: ReadonlyArray<number> = [1, 2, 3, 4]
const isEven = (value: number): boolean => value % 2 === 0

export const filtered = Array.filter(values, isEven)
export const count = Array.countBy(values, isEven)
export const mappedLength = pipe(
  values,
  Array.map((value) => String(value))
).length
export const filterThenMapLength = pipe(
  values,
  Array.filter(isEven),
  Array.map((value) => String(value))
).length
export const nativeCount = values.filter(isEven).length

const LocalArray = {
  filter: (items: ReadonlyArray<number>, predicate: (value: number) => boolean) =>
    items.filter(predicate)
}

export const localCount = LocalArray.filter(values, isEven).length
