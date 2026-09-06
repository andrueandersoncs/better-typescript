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

class DirectCycleReader {
  static read() {
    return directClassCycle
  }
}
const directClassCycle: number = DirectCycleReader.read()

class TransitiveCycleReader {
  static read() {
    return TransitiveCycleReader.continue()
  }
  static continue() {
    return transitiveClassCycle
  }
}
const transitiveClassCycle: number = TransitiveCycleReader.read()

class GetterCycleReader {
  static get read() {
    return getterCycle
  }
}
const getterCycle: number = GetterCycleReader.read

class PropertyCycleReader {
  static read = () => propertyCycle
}
const propertyCycle: number = PropertyCycleReader.read()

const parameterCycle: number = readParameterCycle()
function readParameterCycle(fallback = parameterCycle) {
  return fallback
}

interface OrderedFields {
  readonly lower: number
  readonly upper: number
}

declare function makeFilter<T>(filter: (value: T) => boolean): unknown
makeFilter(((value: OrderedFields) => value.lower < value.upper))

declare function makeValue<T>(): T
const parenthesizedGeneric: number = (makeValue())
