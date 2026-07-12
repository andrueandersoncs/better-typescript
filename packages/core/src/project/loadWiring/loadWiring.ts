import * as fs from "node:fs"
import * as path from "node:path"
import { Array, Effect, Function, flow, pipe, Option, Struct } from "effect"
import { createJiti } from "jiti"
import { NamedCheck, Wiring } from "../../engine/report/data.js"
import { makeWiring } from "../../engine/report/report.js"
import type { Check } from "../../engine/check/check.js"
import type { RefactorExample } from "../../engine/example/data.js"
import { configFileName, ProjectWiringError } from "./data.js"

const defaultExportName = "default"
const wiringExportName = "wiring"

type ConfigExportName = typeof defaultExportName | typeof wiringExportName
type ConfigExport = readonly [name: ConfigExportName, value: unknown]
type ModuleRecord = Readonly<Record<string, unknown>>
type WiringFactory = () => unknown

const projectWiringError = (
  configPath: string,
  reason: string
): ProjectWiringError => {
  const fields = { configPath, reason }

  return new ProjectWiringError(fields)
}

const failConfig = (
  configPath: string,
  reason: string
): Effect.Effect<never, ProjectWiringError> =>
  pipe(projectWiringError(configPath, reason), Effect.fail)

const isRecord = (value: unknown): value is ModuleRecord => {
  const isObject = typeof value === "object"
  const isPresent = value !== null

  return Array.every([isObject, isPresent], Boolean)
}

const isFunctionValue = (value: unknown): value is WiringFactory =>
  typeof value === "function"

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
  (value: unknown): ConfigExport => [name, value]

const defaultConfigExport = configExport(defaultExportName)

const ownConfigExport =
  (name: ConfigExportName) =>
  (valueFromRecord: (record: ModuleRecord) => unknown) =>
    flow(
      Option.liftPredicate((candidate: ModuleRecord): boolean =>
        Object.hasOwn(candidate, name)
      ),
      Option.map(valueFromRecord),
      Option.map(configExport(name))
    )

const defaultOwnConfigExport = ownConfigExport(defaultExportName)(
  Struct.get(defaultExportName)
)

const wiringOwnConfigExport = ownConfigExport(wiringExportName)(
  Struct.get(wiringExportName)
)

const configExportFromRecord = (record: ModuleRecord): ConfigExport => {
  const defaultOwn = defaultOwnConfigExport(record)
  const directExport = defaultConfigExport(record)

  return pipe(
    wiringOwnConfigExport(record),
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

  const recordExport = pipe(
    recordValueOption,
    Option.map(configExportFromRecord)
  )

  const functionValueOption = Option.liftPredicate(isFunctionValue)(moduleValue)

  const functionExport = pipe(
    functionValueOption,
    Option.map(configExportFromFunction)
  )

  const exportOption = pipe(
    recordExport,
    Option.orElse(Function.constant(functionExport))
  )

  const missingExport = failConfig(
    configPath,
    "config must export a default wiring or named wiring"
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
  factory: WiringFactory
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

      return projectWiringError(configPath, reason)
    }
  })
})

const resolvedExport = Effect.fn("resolvedExport")(function* (
  configPath: string,
  moduleValue: unknown
) {
  const exported = yield* selectedExport(configPath, moduleValue)
  const value = exported[1]
  const factoryOption = Option.liftPredicate(isFunctionValue)(value)

  const plainExport = Effect.succeed(value)

  return yield* pipe(
    factoryOption,
    Option.match({
      onNone: Function.constant(plainExport),
      onSome: (factory) => callFactory(configPath, exported[0], factory)
    })
  )
})

const checkShapeReason =
  "{ name: string, check: function, reported?: boolean, examples?: RefactorExample[] }"

const hasNamedCheckFields = (record: ModuleRecord): boolean => {
  const hasStringName = typeof record.name === "string"
  const hasFunctionCheck = typeof record.check === "function"

  const reported = Object.hasOwn(record, "reported")
    ? Option.some(record.reported)
    : Option.none()

  const hasValidReported = pipe(
    reported,
    Option.match({
      onNone: Function.constant(true),
      onSome: (reported) => typeof reported === "boolean"
    })
  )

  const examples = Object.hasOwn(record, "examples")
    ? Option.some(record.examples)
    : Option.none()

  const hasValidExamples = pipe(
    examples,
    Option.match({
      onNone: Function.constant(true),
      onSome: Array.isArray
    })
  )

  return Array.every(
    [hasStringName, hasFunctionCheck, hasValidReported, hasValidExamples],
    Boolean
  )
}

const invalidNamedCheck = (value: unknown): boolean => {
  const recordOption = Option.liftPredicate(isRecord)(value)
  const hasValidShape = Option.exists(recordOption, hasNamedCheckFields)

  return !hasValidShape
}

const namedCheckFrom = (value: unknown): NamedCheck => {
  const record = value as ModuleRecord
  const name = record.name as string
  const check = record.check as Check

  const reported = Object.hasOwn(record, "reported")
    ? (record.reported as boolean)
    : true

  const examples = Object.hasOwn(record, "examples")
    ? (record.examples as ReadonlyArray<RefactorExample>)
    : []

  return new NamedCheck({ name, check, reported, examples })
}

const validateNamedChecks = Effect.fn("validateNamedChecks")(function* (
  configPath: string,
  value: unknown
) {
  const isCheckArray = Array.isArray(value)
  const missingCheckArray = !isCheckArray

  if (missingCheckArray) {
    const reason = `checks must be an array of ${checkShapeReason}`

    return yield* failConfig(configPath, reason)
  }

  const checks = value as ReadonlyArray<unknown>

  const invalidIndex = pipe(
    Array.findFirstIndex(checks, invalidNamedCheck),
    Option.getOrElse(() => -1)
  )

  const hasInvalidCheck = invalidIndex >= 0

  if (hasInvalidCheck) {
    const reason = `checks[${invalidIndex}] must be ${checkShapeReason}`

    return yield* failConfig(configPath, reason)
  }

  return Array.map(checks, namedCheckFrom)
})

const invalidWiringShapeReason =
  "exported wiring must be an object with checks and derive"

const deriveShapeReason = "derive must be a function"

const validateWiringShape = Effect.fn("validateWiringShape")(function* (
  configPath: string,
  value: unknown
) {
  const isWiringRecord = isRecord(value)
  const missingWiringRecord = !isWiringRecord

  if (missingWiringRecord) {
    return yield* failConfig(configPath, invalidWiringShapeReason)
  }

  const record = value as ModuleRecord
  const checks = yield* validateNamedChecks(configPath, record.checks)
  const deriveIsFunction = typeof record.derive === "function"

  if (!deriveIsFunction) {
    return yield* failConfig(configPath, deriveShapeReason)
  }

  const derive = record.derive as Wiring["derive"]

  return new Wiring({ checks, derive })
})

const loadExistingWiring = Effect.fn("loadExistingWiring")(function* (
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

      return projectWiringError(configPath, reason)
    }
  })

  const exportValue = yield* resolvedExport(configPath, moduleValue)
  const wiring = yield* validateWiringShape(configPath, exportValue)

  return yield* Effect.try({
    try: () => makeWiring(wiring),
    catch: (cause) => {
      const reason = formatCause(cause)

      return projectWiringError(configPath, reason)
    }
  })
})

export const loadWiring: (
  projectDirectory: string,
  fallback: Wiring
) => Effect.Effect<Wiring, ProjectWiringError> = Effect.fn("loadWiring")(
  function* (projectDirectory: string, fallback: Wiring) {
    const configPath = path.resolve(projectDirectory, configFileName)
    const exists = yield* Effect.sync(() => fs.existsSync(configPath))
    const missingConfig = !exists

    if (missingConfig) {
      return fallback
    }

    return yield* loadExistingWiring(configPath)
  }
)
