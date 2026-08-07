import { Array } from "effect"
import { strictEqual } from "../../engine/equivalence/strictEqual.js"
import type { UnknownRecord } from "./unknownRecord.js"

const isObjectType = strictEqual("object")

export const isRecord = (value: unknown): value is UnknownRecord => {
  const isObject = isObjectType(typeof value)
  const isNonNull = value !== null
  const conditions = Array.make(isObject, isNonNull)

  return Array.every(conditions, Boolean)
}

export { isObjectType }
