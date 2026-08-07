import * as fs from "node:fs"
import * as path from "node:path"
import { Array, Effect, Function, Option, Predicate, Result, Schema, Struct, pipe } from "effect"
import { createJiti } from "jiti"
import { makeRe } from "minimatch"
import type { MinimatchOptions } from "minimatch"
import type { WiringPolicy } from "../../engine/wiring/wiringPolicy.js"
import { Wiring } from "../../engine/wiring/wiringClass.js"
import { WiringEntry } from "../../engine/wiring/wiringEntry.js"
import type { WiringConfig } from "../../engine/wiring/wiringConfig.js"
import { WiringFilesInput } from "../../engine/wiring/wiringFilesInput.js"
import { WiringEntryInput } from "../../engine/wiring/wiringEntryInput.js"
import { isFileGlob } from "../../engine/wiring/isFileGlob.js"
import { validatePolicyNames } from "../../engine/wiring/duplicatePolicyNames.js"
import { makeWiring } from "../../engine/wiring/makeWiring.js"
import { configFileName } from "./configFileName.js"
import type { ConfigExportName } from "./configExportName.js"
import { defaultConfigExport } from "./defaultConfigExport.js"
import { defaultExportName } from "./defaultExportName.js"
import { failConfig } from "./failConfig.js"
import { formatCause } from "./formatCause.js"
import { isCallable } from "./isCallable.js"
import { isFunctionType } from "./isFunctionType.js"
import { isRecord } from "./isRecord.js"
import { isWiringPolicyInstance } from "./isWiringPolicyInstance.js"
import { matcherHasCallableField } from "./matcherCallableField.js"
import { ownConfigExport } from "./ownConfigExport.js"
import { hasSharedPolicyShape } from "./policyExampleShape.js"
import { ProjectWiringConfigError } from "./projectWiringConfigError.js"
import type { UnknownRecord } from "./unknownRecord.js"

const globOptions: MinimatchOptions = {
  dot: true,
  nonegate: true,
  platform: "linux"
}

const invalidWiringIndexArray = Schema.Array(Schema.Number)

// InvalidWiringFilesError carries invalid entry indexes because validation must stay structured.
export class InvalidWiringFilesError extends Schema.TaggedErrorClass<InvalidWiringFilesError>()(
  "InvalidWiringFilesError",
  {
    indexes: invalidWiringIndexArray
  }
) {
  get message(): string {
    const indexes = Array.map(this.indexes, String)

    return `Wiring files must be non-empty glob arrays at indexes: ${Array.join(indexes, ", ")}`
  }
}

export const compileGlobPattern = (pattern: string) => {
  makeRe(pattern, globOptions)

  return pattern
}

const failInvalidWiringFiles = (indexes: ReadonlyArray<number>) => {
  const error = new InvalidWiringFilesError({ indexes })
  const failure = Effect.fail(error)

  return Effect.runSync(failure)
}

const makeWiringEntryInput = (entry: Pick<WiringEntryInput, "files" | "wiring">) =>
  new WiringEntryInput({ files: entry.files, wiring: entry.wiring })

const isValidWiringFilesInput = (entry: WiringFilesInput) => {
  const hasFiles = entry.files.length > 0
  const hasOnlyNonEmptyPatterns = Array.every(entry.files, isFileGlob)
  const conditions = Array.make(hasFiles, hasOnlyNonEmptyPatterns)

  return Array.every(conditions, Boolean)
}

const compileEntryGlobs = (entry: WiringEntryInput) => {
  Array.forEach(entry.files, compileGlobPattern)
  const wiring = makeWiring(entry.wiring)

  return new WiringEntry({
    files: entry.files,
    wiring
  })
}

const invalidConfigIndex = (entry: WiringEntryInput, index: number) => {
  const filesInput = new WiringFilesInput({ files: entry.files })
  const isValid = isValidWiringFilesInput(filesInput)

  return isValid ? Result.failVoid : Result.succeed(index)
}

const entryPolicies = (entry: WiringEntry) => entry.wiring.policies

// Glob compilation happens at config load because invalid patterns must not fail mid-analysis.
export const defineConfig = (
  config: ReadonlyArray<Pick<WiringEntryInput, "files" | "wiring">>
): WiringConfig => {
  const inputs = Array.map(config, makeWiringEntryInput)
  const invalidIndexes = Array.filterMap(inputs, invalidConfigIndex)

  if (invalidIndexes.length > 0) {
    return failInvalidWiringFiles(invalidIndexes)
  }

  const entries = Array.map(inputs, compileEntryGlobs)
  const policies = Array.flatMap(entries, entryPolicies)

  return validatePolicyNames(policies, entries)
}

// --- project decode / export resolution because loadWiringConfig owns one config authoring SM ---

const configExportName = "config"

const defaultOwnConfigExport = ownConfigExport(defaultExportName)(Struct.get(defaultExportName))
const configOwnConfigExport = ownConfigExport(configExportName)(Struct.get(configExportName))

const configExportFromRecord = (record: UnknownRecord) => {
  const defaultOwn = defaultOwnConfigExport(record)
  const directExport = defaultConfigExport(record)

  const namedOrDefault = pipe(
    configOwnConfigExport(record),
    Option.orElse(Function.constant(defaultOwn))
  )

  return pipe(namedOrDefault, Option.getOrElse(Function.constant(directExport)))
}

const selectedExport = Effect.fn("WiringConfig.selectedExport")(function* (
  configPath: string,
  moduleValue: unknown
) {
  const recordExport = pipe(
    Option.liftPredicate(isRecord)(moduleValue),
    Option.map(configExportFromRecord)
  )

  const functionExport = pipe(
    Option.liftPredicate(isCallable)(moduleValue),
    Option.map(defaultConfigExport)
  )

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

const callFactory = Effect.fn("WiringConfig.callFactory")(function* (
  configPath: string,
  exportName: ConfigExportName,
  factory: () => unknown
) {
  if (factory.length > 0) {
    return yield* failConfig(configPath, `${exportName} export factory must take zero arguments`)
  }

  return yield* Effect.try({
    try: factory,
    catch: (cause) => {
      const causeMessage = formatCause(cause)
      const reason = `${exportName} export factory failed: ${causeMessage}`

      return new ProjectWiringConfigError({ configPath, reason })
    }
  })
})

export const resolvedExport = Effect.fn("WiringConfig.resolvedExport")(function* (
  configPath: string,
  moduleValue: unknown
) {
  const exported = yield* selectedExport(configPath, moduleValue)
  const factoryOption = Option.liftPredicate(isCallable)(exported.value)

  const plainExport = Effect.fn("WiringConfig.plainExport")(function* () {
    return exported.value
  })

  const resolveExportedValue = Effect.fn("WiringConfig.resolveExportedValue")(function* (
    exportedValue: () => unknown
  ) {
    return yield* callFactory(configPath, exported.name, exportedValue)
  })

  return yield* pipe(
    factoryOption,
    Option.match({
      onNone: plainExport,
      onSome: resolveExportedValue
    })
  )
})

const policyShapeReason =
  "a Policy (matcher.plan function) or WorkspacePolicy (matcher.match function)"

const matcherHasPlan = matcherHasCallableField("plan")
const matcherHasMatch = matcherHasCallableField("match")

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

const validatePolicies = Effect.fn("WiringConfig.validatePolicies")(function* (
  configPath: string,
  fieldPath: string,
  value: unknown
) {
  if (!Array.isArray(value)) {
    return yield* failConfig(configPath, `${fieldPath} must be an array of ${policyShapeReason}`)
  }

  const invalidIndexOption = Array.findFirstIndex(value as ReadonlyArray<unknown>, invalidPolicy)

  if (Option.isSome(invalidIndexOption)) {
    return yield* failConfig(
      configPath,
      `${fieldPath}[${invalidIndexOption.value}] must be ${policyShapeReason}`
    )
  }

  const nonInstanceIndexOption = Array.findFirstIndex(
    value as ReadonlyArray<unknown>,
    isNonWiringPolicyInstance
  )

  if (Option.isSome(nonInstanceIndexOption)) {
    return yield* failConfig(
      configPath,
      `${fieldPath}[${nonInstanceIndexOption.value}] must be ${policyShapeReason}`
    )
  }

  return value as ReadonlyArray<WiringPolicy>
})

const validateWiringShape = Effect.fn("WiringConfig.validateWiringShape")(function* (
  configPath: string,
  fieldPath: string,
  value: unknown
) {
  if (!isRecord(value)) {
    return yield* failConfig(configPath, `${fieldPath} must be an object with policies and derive`)
  }

  const policiesPath = `${fieldPath}.policies`
  const policies = yield* validatePolicies(configPath, policiesPath, value.policies)

  if (!isFunctionType(typeof value.derive)) {
    return yield* failConfig(configPath, `${fieldPath}.derive must be a function`)
  }

  return new Wiring({ policies, derive: value.derive as Wiring["derive"] })
})

const isStringFileGlob = (value: unknown): value is string => {
  const isString = Predicate.isString(value)
  const isGlob = isString && isFileGlob(value)
  const conditions = Array.make(isString, isGlob)

  return Array.every(conditions, Boolean)
}

const isNonEmptyFileGlobArray = (
  files: ReadonlyArray<unknown>
): files is Array.NonEmptyReadonlyArray<string> => {
  const everyGlob = Array.every(files, isStringFileGlob)
  const nonEmpty = Array.isReadonlyArrayNonEmpty(files)
  const conditions = Array.make(everyGlob, nonEmpty)

  return Array.every(conditions, Boolean)
}

const validateWiringEntry = Effect.fn("WiringConfig.validateWiringEntry")(function* (
  configPath: string,
  value: unknown,
  index: number
) {
  const fieldPath = `config[${index}]`
  const recordOption = Option.liftPredicate(isRecord)(value)

  if (Option.isNone(recordOption)) {
    return yield* failConfig(configPath, `${fieldPath} must be an object with files and wiring`)
  }

  const filesOption = pipe(
    recordOption.value.files,
    Option.liftPredicate<unknown, ReadonlyArray<unknown>>(Array.isArray),
    Option.filter(isNonEmptyFileGlobArray)
  )

  if (Option.isNone(filesOption)) {
    return yield* failConfig(
      configPath,
      `${fieldPath}.files must be a non-empty array of non-empty glob strings`
    )
  }

  const wiringPath = `${fieldPath}.wiring`
  const wiring = yield* validateWiringShape(configPath, wiringPath, recordOption.value.wiring)

  return new WiringEntry({ files: filesOption.value, wiring })
})

const validateWiringConfig = Effect.fn("WiringConfig.validateWiringConfig")(function* (
  configPath: string,
  value: unknown
) {
  if (!Array.isArray(value)) {
    return yield* failConfig(
      configPath,
      "exported config must be an array of { files: string[], wiring: { policies, derive } }"
    )
  }

  const validateEntryAt = (entry: unknown, index: number) =>
    validateWiringEntry(configPath, entry, index)

  const entries: ReadonlyArray<Pick<WiringEntry, "files" | "wiring">> = yield* Effect.forEach(
    value,
    validateEntryAt
  )

  return yield* Effect.try({
    try: () => defineConfig(entries),
    catch: (cause) => {
      const reason = formatCause(cause)

      return new ProjectWiringConfigError({ configPath, reason })
    }
  })
})

// Decoding stays filesystem-free because tests and the loader must share one validation path.
export const decodeWiringConfig: (
  configPath: string,
  moduleValue: unknown
) => Effect.Effect<WiringConfig, ProjectWiringConfigError> = Effect.fn("WiringConfig.decode")(
  function* (configPath: string, moduleValue: unknown) {
    const exportValue = yield* resolvedExport(configPath, moduleValue)

    return yield* validateWiringConfig(configPath, exportValue)
  }
)

const loadExistingWiringConfig = Effect.fn("WiringConfig.loadExisting")(function* (
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

      return new ProjectWiringConfigError({ configPath, reason })
    }
  })

  return yield* decodeWiringConfig(configPath, moduleValue)
})

export const loadWiringConfig: (
  projectDirectory: string,
  fallback: WiringConfig
) => Effect.Effect<WiringConfig, ProjectWiringConfigError> = Effect.fn("WiringConfig.load")(
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
