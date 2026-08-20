import { importedStable } from "./liveBinding.js"

const stableRecord = { value: "property" }
let mutableValue = "mutable"

export const returnsArray = () => ["fresh"]
export const returnsObject = () => ({ status: "fresh" })
export const returnsCall = () => String("called")
export const returnsNew = () => new Date(0)
export const returnsProperty = () => stableRecord.value
export const returnsMutable = () => mutableValue
export const returnsImported = () => importedStable
export const returnsLaterConst = (): string => laterStable

const laterStable = "later"

export const asyncLiteral = async () => "async"

export const generatorLiteral = function* () {
  return "generator"
}

export const parameterizedLiteral = (value: string) => "parameterized"

export const genericLiteral = <Value>(): string => "generic"

export const nonSingleReturnBlock = () => {
  const value = "local"
  return value
}

export const multiReturnBlock = () => {
  if (Date.now() > 0) {
    return "now"
  }
  return "later"
}

const { destructuredStable } = { destructuredStable: "destructured" }

export const returnsDestructured = () => destructuredStable

export const makeCaptured =
  (value: string): (() => string) =>
  () =>
    value

void mutableValue
