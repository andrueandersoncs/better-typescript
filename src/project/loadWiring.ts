import * as fs from "node:fs"
import * as path from "node:path"
import { Effect, Option, Schema, Struct, pipe } from "effect"
import { createJiti } from "jiti"
import { NamedCheck, Wiring, makeWiring } from "../engine/report.js"
import type { Check } from "../engine/check.js"

const configFileName = "better-typescript.config.ts"
const defaultExportName = "default"
const wiringExportName = "wiring"

type ConfigExportName = typeof defaultExportName | typeof wiringExportName
type ConfigExport = readonly [name: ConfigExportName, value: unknown]
type ModuleRecord = Readonly<Record<string, unknown>>
type WiringFactory = () => unknown

export class ProjectWiringError extends Schema.TaggedError<ProjectWiringError>(
  "ProjectWiringError"
)("ProjectWiringError", {
  configPath: Schema.String,
  reason: Schema.String
}) {
  get message(): string {
    return `Invalid ${configFileName} at ${this.configPath}: ${this.reason}`
  }
}

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
): Effect.Effect<never, ProjectWiringError> => {
  const error = projectWiringError(configPath, reason)

  return Effect.fail(error)
}

const isRecord = (value: unknown): value is ModuleRecord => {
  const isObject = typeof value === "object"
  const isPresent = value !== null

  return [isObject, isPresent].every(Boolean)
}

const isFunctionValue = (value: unknown): value is WiringFactory =>
  typeof value === "function"

const isError = (cause: unknown): cause is Error => cause instanceof Error

const errorMessage: (error: Error) => string = Struct.get("message")

const hasText = (value: string): boolean => value.length > 0

const causeText = (cause: unknown) => (): string => String(cause)

const formatCause = (cause: unknown): string =>
  pipe(
    Option.liftPredicate(isError)(cause),
    Option.map(errorMessage),
    Option.filter(hasText),
    Option.getOrElse(causeText(cause))
  )

const loadConfigFailure =
  (configPath: string) =>
  (cause: unknown): ProjectWiringError => {
    const causeMessage = formatCause(cause)
    const reason = `failed to load config module: ${causeMessage}`

    return projectWiringError(configPath, reason)
  }

const importConfig = (configPath: string) => (): Promise<unknown> => {
  const jiti = createJiti(import.meta.url)

  return jiti.import(configPath)
}

const configExport =
  (name: ConfigExportName) =>
  (value: unknown): ConfigExport => [name, value]

const defaultConfigExport = configExport(defaultExportName)

const defaultRecordValue: (record: ModuleRecord) => unknown =
  Struct.get(defaultExportName)

const wiringRecordValue: (record: ModuleRecord) => unknown =
  Struct.get(wiringExportName)

const recordHasOwnKey =
  (key: ConfigExportName) =>
  (record: ModuleRecord): boolean =>
    Object.hasOwn(record, key)

const ownConfigExport =
  (name: ConfigExportName) =>
  (valueFromRecord: (record: ModuleRecord) => unknown) =>
  (record: ModuleRecord): Option.Option<ConfigExport> => {
    const recordWithKey = Option.liftPredicate(recordHasOwnKey(name))(record)

    return pipe(
      recordWithKey,
      Option.map(valueFromRecord),
      Option.map(configExport(name))
    )
  }

const defaultOwnConfigExport =
  ownConfigExport(defaultExportName)(defaultRecordValue)

const wiringOwnConfigExport =
  ownConfigExport(wiringExportName)(wiringRecordValue)

const defaultOwnExport =
  (record: ModuleRecord) => (): Option.Option<ConfigExport> =>
    defaultOwnConfigExport(record)

const directRecordExport = (record: ModuleRecord) => (): ConfigExport =>
  defaultConfigExport(record)

const configExportFromRecord = (record: ModuleRecord): ConfigExport =>
  pipe(
    wiringOwnConfigExport(record),
    Option.orElse(defaultOwnExport(record)),
    Option.getOrElse(directRecordExport(record))
  )

const configExportFromFunction = (factory: WiringFactory): ConfigExport =>
  defaultConfigExport(factory)

const fallbackExport =
  (fallback: Option.Option<ConfigExport>) => (): Option.Option<ConfigExport> =>
    fallback

const missingConfigExport =
  (configPath: string) => (): Effect.Effect<never, ProjectWiringError> =>
    failConfig(
      configPath,
      "config must export a default wiring or named wiring"
    )

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
    Option.orElse(fallbackExport(functionExport))
  )

  return yield* pipe(
    exportOption,
    Option.match({
      onNone: missingConfigExport(configPath),
      onSome: Effect.succeed
    })
  )
})

const factoryFailure =
  (configPath: string) =>
  (exportName: ConfigExportName) =>
  (cause: unknown): ProjectWiringError => {
    const causeMessage = formatCause(cause)
    const reason = `${exportName} export factory failed: ${causeMessage}`

    return projectWiringError(configPath, reason)
  }

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
    catch: factoryFailure(configPath)(exportName)
  })
})

const resolvedPlainExport = (value: unknown) => (): Effect.Effect<unknown> =>
  Effect.succeed(value)

const selectedFactory =
  (configPath: string) =>
  (selected: ConfigExport) =>
  (factory: WiringFactory): Effect.Effect<unknown, ProjectWiringError> => {
    const exportName = selected[0]

    return callFactory(configPath, exportName, factory)
  }

const resolvedExport = Effect.fn("resolvedExport")(function* (
  configPath: string,
  moduleValue: unknown
) {
  const exported = yield* selectedExport(configPath, moduleValue)
  const value = exported[1]
  const factoryOption = Option.liftPredicate(isFunctionValue)(value)

  return yield* pipe(
    factoryOption,
    Option.match({
      onNone: resolvedPlainExport(value),
      onSome: selectedFactory(configPath)(exported)
    })
  )
})

const checkShapeReason = "{ name: string, check: function, reported?: boolean }"

const hasNamedCheckFields = (record: ModuleRecord): boolean => {
  const hasStringName = typeof record.name === "string"
  const hasFunctionCheck = typeof record.check === "function"
  const reported = Object.hasOwn(record, "reported")
    ? Option.some(record.reported)
    : Option.none()
  const hasValidReported = pipe(
    reported,
    Option.match({
      onNone: () => true,
      onSome: (reported) => typeof reported === "boolean"
    })
  )

  return [hasStringName, hasFunctionCheck, hasValidReported].every(Boolean)
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

  return new NamedCheck({ name, check, reported })
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
  const invalidIndex = checks.findIndex(invalidNamedCheck)
  const hasInvalidCheck = invalidIndex >= 0

  if (hasInvalidCheck) {
    const reason = `checks[${invalidIndex}] must be ${checkShapeReason}`

    return yield* failConfig(configPath, reason)
  }

  return checks.map(namedCheckFrom)
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

const makeValidatedWiring = (wiring: Wiring) => (): Wiring => makeWiring(wiring)

const wiringNamesFailure =
  (configPath: string) =>
  (cause: unknown): ProjectWiringError => {
    const reason = formatCause(cause)

    return projectWiringError(configPath, reason)
  }

const loadExistingWiring = Effect.fn("loadExistingWiring")(function* (
  configPath: string
) {
  const moduleValue = yield* Effect.tryPromise({
    try: importConfig(configPath),
    catch: loadConfigFailure(configPath)
  })
  const exportValue = yield* resolvedExport(configPath, moduleValue)
  const wiring = yield* validateWiringShape(configPath, exportValue)

  return yield* Effect.try({
    try: makeValidatedWiring(wiring),
    catch: wiringNamesFailure(configPath)
  })
})

const configExists = (configPath: string) => (): boolean =>
  fs.existsSync(configPath)

export const loadWiring: (
  projectDirectory: string,
  fallback: Wiring
) => Effect.Effect<Wiring, ProjectWiringError> = Effect.fn("loadWiring")(
  function* (projectDirectory: string, fallback: Wiring) {
    const configPath = path.resolve(projectDirectory, configFileName)
    const exists = yield* Effect.sync(configExists(configPath))
    const missingConfig = !exists

    if (missingConfig) {
      return fallback
    }

    return yield* loadExistingWiring(configPath)
  }
)
