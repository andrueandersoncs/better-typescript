import { Array, Function, Predicate, Schema } from "effect"
import type { SemanticModuleEvidence } from "./semanticModuleEvidence.js"
import type { JsonRecord } from "./jsonRecord.js"
import { isJsonArray } from "./isJsonArray.js"

const isJsonRecord = (value: Schema.Json): value is JsonRecord => {
  const notNullish = Predicate.isNotNullish(value)
  const objectValue = Predicate.isObject(value)
  const arrayValue = isJsonArray(value)
  const flags = Array.make(notNullish, objectValue, !arrayValue)
  return Array.every(flags, Function.identity)
}

const freezeJsonArray = (value: ReadonlyArray<Schema.Json>): ReadonlyArray<Schema.Json> => {
  Array.forEach(value, freezeNestedJson)
  return Object.freeze(value)
}

const freezeJsonRecord = (value: JsonRecord): JsonRecord => {
  const values = Object.values(value)
  Array.forEach(values, freezeNestedJson)
  return Object.freeze(value)
}

export const freezeNestedJson = (value: Schema.Json): Schema.Json => {
  if (isJsonArray(value)) {
    return freezeJsonArray(value)
  }

  return isJsonRecord(value) ? freezeJsonRecord(value) : value
}

export const freezeEvidence = (evidence: SemanticModuleEvidence): SemanticModuleEvidence => {
  freezeNestedJson(evidence)
  return Object.freeze(evidence)
}
