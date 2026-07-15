import * as fs from "node:fs"
import * as path from "node:path"
import { Array, Effect, Function, flow, pipe, Option, Struct } from "effect"
import { createJiti } from "jiti"
import { NamedCheck, Wiring, WiringEntry } from "../../engine/report/data.js"
import type { WiringConfig } from "../../engine/report/data.js"
import { defineConfig } from "../../engine/report/report.js"
import type { Check } from "../../engine/check/data.js"
import type { RefactorExample } from "../../engine/example/data.js"
import { ConfigExport, configFileName, ProjectWiringConfigError } from "./data.js"
import type { ConfigExportName } from "./data.js"

const defaultExportName = "default"
const configExportName = "config"

const projectWiringConfigError = (configPath: string, reason: string): ProjectWiringConfigError => {
  const fields = { configPath, reason }

  return new ProjectWiringConfigError(fields)
}

const failConfig = (
  configPath: string,
  reason: string
): Effect.Effect<never, ProjectWiringConfigError> =>
  pipe(projectWiringConfigError(configPath, reason), Effect.fail)

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => {
  const isObject = typeof value === "object"
  const isPresent = value !== null

  const conditions = Array.make(isObject, isPresent)
  return Array.every(conditions, Boolean)
}

const isFunctionValue = (value: unknown): value is () => unknown => typeof value === "function"

const isError = (cause: unknown): cause is Error => cause instanceof Error

const hasText = (value: string): boolean => value.length > 0

const formatCause = (cause: unknown): string => {
  const fallbackText = String(cause)

  return pipe(
    Option.liftPredicate(isError)(cause),
    Option.map(Struct.get("message")),
    Option.filter(hasText),
    Option.getOrElse(Function.constant(fallbackText))
  )
}

const configExport =
  (name: ConfigExportName) =>
  (value: unknown): ConfigExport =>
    new ConfigExport({ name, value })

const defaultConfigExport = configExport(defaultExportName)

const ownConfigExport =
  (name: ConfigExportName) =>
  (valueFromRecord: (record: Readonly<Record<string, unknown>>) => unknown) =>
    flow(
      Option.liftPredicate((candidate: Readonly<Record<string, unknown>>): boolean =>
        Object.hasOwn(candidate, name)
      ),
      Option.map(valueFromRecord),
      Option.map(configExport(name))
    )

const defaultOwnConfigExport = ownConfigExport(defaultExportName)(Struct.get(defaultExportName))

const configOwnConfigExport = ownConfigExport(configExportName)(Struct.get(configExportName))

const configExportFromRecord = (record: Readonly<Record<string, unknown>>): ConfigExport => {
  const defaultOwn = defaultOwnConfigExport(record)
  const directExport = defaultConfigExport(record)

  return pipe(
    configOwnConfigExport(record),
    Option.orElse(Function.constant(defaultOwn)),
    Option.getOrElse(Function.constant(directExport))
  )
}

const configExportFromFunction = defaultConfigExport

const selectedExport = Effect.fn("selectedExport")(function* (
  configPath: string,
  moduleValue: unknown
) {
  const recordValueOption = Option.liftPredicate(isRecord)(moduleValue)

  const recordExport = pipe(recordValueOption, Option.map(configExportFromRecord))

  const functionValueOption = Option.liftPredicate(isFunctionValue)(moduleValue)

  const functionExport = pipe(functionValueOption, Option.map(configExportFromFunction))

  const exportOption = pipe(recordExport, Option.orElse(Function.constant(functionExport)))

  const missingExport = failConfig(
    configPath,
    "config must export a default configuration or named config"
  )

  return yield* pipe(
    exportOption,
    Option.match({
      onNone: Function.constant(missingExport),
      onSome: Effect.succeed
    })
  )
})

const callFactory = Effect.fn("callFactory")(function* (
  configPath: string,
  exportName: ConfigExportName,
  factory: () => unknown
) {
  const hasParameters = factory.length > 0

  if (hasParameters) {
    const reason = `${exportName} export factory must take zero arguments`

    return yield* failConfig(configPath, reason)
  }

  return yield* Effect.try({
    try: factory,
    catch: (cause) => {
      const causeMessage = formatCause(cause)
      const reason = `${exportName} export factory failed: ${causeMessage}`

      return projectWiringConfigError(configPath, reason)
    }
  })
})

const resolvedExport = Effect.fn("resolvedExport")(function* (
  configPath: string,
  moduleValue: unknown
) {
  const exported = yield* selectedExport(configPath, moduleValue)
  const value = exported.value
  const factoryOption = Option.liftPredicate(isFunctionValue)(value)

  const plainExport = Effect.succeed(value)

  return yield* pipe(
    factoryOption,
    Option.match({
      onNone: Function.constant(plainExport),
      onSome: (factory) => callFactory(configPath, exported.name, factory)
    })
  )
})

const checkShapeReason =
  "{ name: string, check: { plan: function }, reported?: boolean, examples?: RefactorExample[] }"

const hasNamedCheckFields = (record: Readonly<Record<string, unknown>>): boolean => {
  const hasStringName = typeof record.name === "string"

  const hasCheckPlan = pipe(
    Option.liftPredicate(isRecord)(record.check),
    Option.exists((check) => typeof check.plan === "function")
  )

  const reported = Object.hasOwn(record, "reported") ? Option.some(record.reported) : Option.none()

  const hasValidReported = pipe(
    reported,
    Option.match({
      onNone: Function.constant(true),
      onSome: (reported) => typeof reported === "boolean"
    })
  )

  const examples = Object.hasOwn(record, "examples") ? Option.some(record.examples) : Option.none()

  const hasValidExamples = pipe(
    examples,
    Option.match({
      onNone: Function.constant(true),
      onSome: Array.isArray
    })
  )

  const hasNoLegacyPaths = !Object.hasOwn(record, "paths")

  const namedCheckShapeConditions = Array.make(
    hasStringName,
    hasCheckPlan,
    hasValidReported,
    hasValidExamples,
    hasNoLegacyPaths
  )

  return Array.every(namedCheckShapeConditions, Boolean)
}

const invalidNamedCheck = (value: unknown): boolean => {
  const recordOption = Option.liftPredicate(isRecord)(value)
  const hasValidShape = Option.exists(recordOption, hasNamedCheckFields)

  return !hasValidShape
}

const namedCheckFrom = (value: unknown): NamedCheck => {
  const record = value as Readonly<Record<string, unknown>>
  const name = record.name as string
  const check = record.check as Check

  const reported = Object.hasOwn(record, "reported") ? (record.reported as boolean) : true

  const examples = Object.hasOwn(record, "examples")
    ? (record.examples as ReadonlyArray<RefactorExample>)
    : Array.empty()

  return new NamedCheck({ name, check, reported, examples })
}

const validateNamedChecks = Effect.fn("validateNamedChecks")(function* (
  configPath: string,
  fieldPath: string,
  value: unknown
) {
  const isCheckArray = Array.isArray(value)
  const missingCheckArray = !isCheckArray

  if (missingCheckArray) {
    const reason = `${fieldPath} must be an array of ${checkShapeReason}`

    return yield* failConfig(configPath, reason)
  }

  const checks = value as ReadonlyArray<unknown>

  const invalidIndex = pipe(
    Array.findFirstIndex(checks, invalidNamedCheck),
    Option.getOrElse(() => -1)
  )

  const hasInvalidCheck = invalidIndex >= 0

  if (hasInvalidCheck) {
    const reason = `${fieldPath}[${invalidIndex}] must be ${checkShapeReason}`

    return yield* failConfig(configPath, reason)
  }

  return Array.map(checks, namedCheckFrom)
})

const validateWiringShape = Effect.fn("validateWiringShape")(function* (
  configPath: string,
  fieldPath: string,
  value: unknown
) {
  const isWiringRecord = isRecord(value)
  const missingWiringRecord = !isWiringRecord

  if (missingWiringRecord) {
    const reason = `${fieldPath} must be an object with checks and derive`

    return yield* failConfig(configPath, reason)
  }

  const record = value as Readonly<Record<string, unknown>>

  const checks = yield* validateNamedChecks(configPath, `${fieldPath}.checks`, record.checks)

  const deriveIsFunction = typeof record.derive === "function"

  if (!deriveIsFunction) {
    const reason = `${fieldPath}.derive must be a function`

    return yield* failConfig(configPath, reason)
  }

  const derive = record.derive as Wiring["derive"]

  return new Wiring({ checks, derive })
})

const isFileGlob = (value: unknown): value is string => {
  const isString = typeof value === "string"

  return isString && value.trim().length > 0
}

const isUnknownArray: (value: unknown) => value is ReadonlyArray<unknown> = Array.isArray

const validateWiringEntry = Effect.fn("validateWiringEntry")(function* (
  configPath: string,
  value: unknown,
  index: number
) {
  const fieldPath = `config[${index}]`
  const recordOption = Option.liftPredicate(isRecord)(value)

  if (Option.isNone(recordOption)) {
    const reason = `${fieldPath} must be an object with files and wiring`

    return yield* failConfig(configPath, reason)
  }

  const record = recordOption.value

  const filesOption = pipe(
    record.files,
    Option.liftPredicate(isUnknownArray),
    Option.filter(Array.every(isFileGlob)),
    Option.filter(Array.isNonEmptyReadonlyArray)
  )

  if (Option.isNone(filesOption)) {
    const reason = `${fieldPath}.files must be a non-empty array of non-empty glob strings`

    return yield* failConfig(configPath, reason)
  }

  const files = filesOption.value

  const wiring = yield* validateWiringShape(configPath, `${fieldPath}.wiring`, record.wiring)

  return new WiringEntry({ files, wiring })
})

const validateWiringConfig = Effect.fn("validateWiringConfig")(function* (
  configPath: string,
  value: unknown
) {
  if (!Array.isArray(value)) {
    return yield* failConfig(
      configPath,
      "exported config must be an array of { files: string[], wiring: { checks, derive } }"
    )
  }

  const entries = yield* Effect.forEach(value, (entry, index) =>
    validateWiringEntry(configPath, entry, index)
  )

  return yield* Effect.try({
    try: () => defineConfig(entries),
    catch: (cause) => {
      const reason = formatCause(cause)

      return projectWiringConfigError(configPath, reason)
    }
  })
})

const loadExistingWiringConfig = Effect.fn("loadExistingWiringConfig")(function* (
  configPath: string
) {
  const moduleValue = yield* Effect.tryPromise({
    try: () => {
      const jiti = createJiti(import.meta.url)

      return jiti.import(configPath)
    },
    catch: (cause) => {
      const causeMessage = formatCause(cause)
      const reason = `failed to load config module: ${causeMessage}`

      return projectWiringConfigError(configPath, reason)
    }
  })

  const exportValue = yield* resolvedExport(configPath, moduleValue)

  return yield* validateWiringConfig(configPath, exportValue)
})

export const loadWiringConfig: (
  projectDirectory: string,
  fallback: WiringConfig
) => Effect.Effect<WiringConfig, ProjectWiringConfigError> = Effect.fn("loadWiringConfig")(
  function* (projectDirectory: string, fallback: WiringConfig) {
    const configPath = path.resolve(projectDirectory, configFileName)
    const exists = yield* Effect.sync(() => fs.existsSync(configPath))
    const missingConfig = !exists

    if (missingConfig) {
      return fallback
    }

    return yield* loadExistingWiringConfig(configPath)
  }
)
