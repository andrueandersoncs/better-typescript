export const state: "open" | "closed" = "open"

const isEven: (value: number) => boolean = (value) => value === 0 || isOdd(value - 1)
const isOdd: (value: number) => boolean = (value) => value !== 0 && isEven(value - 1)

const directCycle: number = readDirectCycle()
function readDirectCycle() {
  return directCycle
}

const transitiveCycle: number = readTransitiveCycle()
function readTransitiveCycle() {
  return continueTransitiveCycle()
}
function continueTransitiveCycle() {
  return transitiveCycle
}

interface OrderedFields {
  readonly lower: number
  readonly upper: number
}

declare function makeFilter<T>(filter: (value: T) => boolean): unknown
makeFilter((value: OrderedFields) => value.lower < value.upper)
