import { Array, Effect, Function, Option, pipe } from "effect"
import { isProgramPolicy, isWorkspacePolicy, type WiringPolicy } from "../../engine/wiring/data.js"
import { strictEqual } from "../../engine/equivalence.js"
import {
  failConfig,
  isFunctionType as functionTypePredicate,
  isRecord,
  isStringType,
  type UnknownRecord
} from "./decodeExport.js"

const isFunctionType = functionTypePredicate
const isBooleanType = strictEqual("boolean")
const isInlineTag = strictEqual("inline")
const isDirectoryTag = strictEqual("directory")

const policyShapeReason =
  "a Policy (matcher.plan function) or WorkspacePolicy (matcher.match function)"

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

const fieldValue = (record: UnknownRecord, field: string) =>
  Object.hasOwn(record, field) ? Option.some(record[field]) : Option.none()

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

// MatcherCallableField is plan or match because those callable fields discriminate policies.
type MatcherCallableField = "plan" | "match"

const matcherHasCallableField = (field: MatcherCallableField) => {
  const recordFieldIsCallable = (record: UnknownRecord) => isFunctionType(typeof record[field])

  const matcherRecordIsCallable = (matcher: unknown) =>
    pipe(Option.liftPredicate(isRecord)(matcher), Option.exists(recordFieldIsCallable))

  return matcherRecordIsCallable
}

const matcherHasPlan = matcherHasCallableField("plan")
const matcherHasMatch = matcherHasCallableField("match")

const hasSharedPolicyShape = (record: UnknownRecord) => {
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

const hasProgramPolicyShape = (record: UnknownRecord) => {
  const shared = hasSharedPolicyShape(record)
  const hasPlan = matcherHasPlan(record.matcher)
  const conditions = Array.make(shared, hasPlan)

  return Array.every(conditions, Boolean)
}

const hasWorkspacePolicyShape = (record: UnknownRecord) => {
  const shared = hasSharedPolicyShape(record)
  const hasMatch = matcherHasMatch(record.matcher)
  const conditions = Array.make(shared, hasMatch)

  return Array.every(conditions, Boolean)
}

const isWiringPolicyInstance = (value: unknown): value is WiringPolicy => {
  const programPolicy = isProgramPolicy(value)
  const workspacePolicy = isWorkspacePolicy(value)
  const conditions = Array.make(programPolicy, workspacePolicy)

  return Array.some(conditions, Boolean)
}

const hasValidPolicyShape = (record: UnknownRecord) => {
  const programShape = hasProgramPolicyShape(record)
  const workspaceShape = hasWorkspacePolicyShape(record)
  const conditions = Array.make(programShape, workspaceShape)

  return Array.some(conditions, Boolean)
}

const invalidPolicy = (value: unknown) => {
  const isInstance = isWiringPolicyInstance(value)
  const hasShape = pipe(Option.liftPredicate(isRecord)(value), Option.exists(hasValidPolicyShape))
  const isValid = isInstance || hasShape

  return !isValid
}

const isNonWiringPolicyInstance = (policy: unknown) => !isWiringPolicyInstance(policy)

export const validatePolicies = Effect.fn("WiringConfig.validatePolicies")(function* (
  configPath: string,
  fieldPath: string,
  value: unknown
) {
  if (!Array.isArray(value)) {
    return yield* failConfig(configPath, `${fieldPath} must be an array of ${policyShapeReason}`)
  }

  const policies = value as ReadonlyArray<unknown>
  const invalidIndexOption = Array.findFirstIndex(policies, invalidPolicy)

  if (Option.isSome(invalidIndexOption)) {
    return yield* failConfig(
      configPath,
      `${fieldPath}[${invalidIndexOption.value}] must be ${policyShapeReason}`
    )
  }

  const nonInstanceIndexOption = Array.findFirstIndex(policies, isNonWiringPolicyInstance)

  if (Option.isSome(nonInstanceIndexOption)) {
    return yield* failConfig(
      configPath,
      `${fieldPath}[${nonInstanceIndexOption.value}] must be ${policyShapeReason}`
    )
  }

  return policies as ReadonlyArray<WiringPolicy>
})
