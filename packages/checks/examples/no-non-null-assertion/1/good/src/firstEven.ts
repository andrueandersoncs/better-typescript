import { Array, Option } from "effect"

declare const numbers: ReadonlyArray<number>

const isEven = (value: number): boolean => value % 2 === 0

const firstEvenNumber = Array.findFirst(numbers, isEven)

export const firstEven = Option.getOrElse(firstEvenNumber, () => 0)
