import { Array, Function, Option, pipe } from "effect"
import { strictEqual } from "../../engine/equivalence/strictEqual.js"
import { fieldValue } from "./fieldValue.js"
import { isFunctionType } from "./isFunctionType.js"
import { isRecord } from "./isRecord.js"
import { isStringType } from "./isStringType.js"
import type { UnknownRecord } from "./unknownRecord.js"

const isBooleanType = strictEqual("boolean")
const isInlineTag = strictEqual("inline")
const isDirectoryTag = strictEqual("directory")

const recordFieldType = (record: UnknownRecord, field: string) => typeof record[field]

const isInlineExampleSource = (examples: UnknownRecord) => {
  const hasInlineTag = isInlineTag(examples._tag)
  const hasExamplesArray = Array.isArray(examples.examples)
  const conditions = Array.make(hasInlineTag, hasExamplesArray)

  return Array.every(conditions, Boolean)
}

const isDirectoryExampleSource = (examples: UnknownRecord) => {
  const hasDirectoryTag = isDirectoryTag(examples._tag)
  const hasStringRoot = isStringType(typeof examples.root)
  const conditions = Array.make(hasDirectoryTag, hasStringRoot)

  return Array.every(conditions, Boolean)
}

const isExampleSourceRecord = (examples: UnknownRecord) => {
  const inlineSource = isInlineExampleSource(examples)
  const directorySource = isDirectoryExampleSource(examples)
  const conditions = Array.make(inlineSource, directorySource)

  return Array.some(conditions, Boolean)
}

const isRefactorExampleSource = (value: unknown) =>
  pipe(Option.liftPredicate(isRecord)(value), Option.exists(isExampleSourceRecord))

const reportedFieldIsValid = (reportedValue: unknown) => isBooleanType(typeof reportedValue)

const hasValidReportedField = (record: UnknownRecord) =>
  pipe(
    fieldValue(record, "reported"),
    Option.match({
      onNone: Function.constTrue,
      onSome: reportedFieldIsValid
    })
  )

const hasValidExamplesField = (record: UnknownRecord) =>
  pipe(
    fieldValue(record, "examples"),
    Option.match({
      onNone: Function.constTrue,
      onSome: isRefactorExampleSource
    })
  )

export const hasSharedPolicyShape = (record: UnknownRecord) => {
  const nameType = recordFieldType(record, "name")
  const guidanceType = recordFieldType(record, "guidance")
  const hasStringName = isStringType(nameType)
  const hasGuidance = isFunctionType(guidanceType)
  const hasNoLegacyPaths = !Object.hasOwn(record, "paths")
  const reportedValid = hasValidReportedField(record)
  const examplesValid = hasValidExamplesField(record)

  const conditions = Array.make(
    hasStringName,
    hasGuidance,
    reportedValid,
    examplesValid,
    hasNoLegacyPaths
  )

  return Array.every(conditions, Boolean)
}
