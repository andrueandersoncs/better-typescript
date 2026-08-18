import * as fs from "node:fs"
import * as path from "node:path"
import {
  Array,
  Data,
  Effect,
  Function,
  Option,
  Predicate,
  Result,
  Schema,
  Struct,
  flow,
  pipe
} from "effect"
import { createJiti } from "jiti"
import { makeRe } from "minimatch"
import type { MinimatchOptions } from "minimatch"
import { isProgramPolicy } from "../../engine/wiring/isProgramPolicy.js"
import { isWorkspacePolicy } from "../../engine/wiring/workspacePolicyInstance.js"
import type { WiringPolicy } from "../../engine/wiring/wiringPolicy.js"
import { Wiring } from "../../engine/wiring/wiringClass.js"
import type { WiringError } from "../../engine/wiring/wiringError.js"
import { WiringEntry } from "../../engine/wiring/wiringEntry.js"
import type { WiringConfig } from "../../engine/wiring/wiringConfig.js"
import { WiringFilesInput } from "../../engine/wiring/wiringFilesInput.js"
import { WiringEntryInput } from "../../engine/wiring/wiringEntryInput.js"
import { isFileGlob } from "../../engine/wiring/isFileGlob.js"
import { validatePolicyNames } from "../../engine/wiring/duplicatePolicyNames.js"
import { makeWiring } from "../../engine/wiring/makeWiring.js"
import { strictEqual } from "../../engine/equivalence/strictEqual.js"

// ProjectWiringConfigError is failure protocol because loader/CLI need fields.
export class ProjectWiringConfigError extends Schema.TaggedErrorClass<ProjectWiringConfigError>()(
  "ProjectWiringConfigError",
  {
    configPath: Schema.String,
    reason: Schema.String
  }
) {
  get message(): string {
    return `Invalid better-typescript.config.ts at ${this.configPath}: ${this.reason}`
  }
}

const globOptions: MinimatchOptions = {
  dot: true,
  nonegate: true,
  platform: "linux"
}

const invalidWiringIndexArray = Schema.Array(Schema.Number)

const isWiringPolicyInstance = (value: unknown): value is WiringPolicy => {
  const programPolicy = isProgramPolicy(value)
  const workspacePolicy = isWorkspacePolicy(value)
  const conditions = Array.make(programPolicy, workspacePolicy)

  return Array.some(conditions, Boolean)
}

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

const compileGlobPattern = (pattern: string) => {
  makeRe(pattern, globOptions)

  return pattern
}

const failInvalidWiringFiles = (indexes: ReadonlyArray<number>) => {
  const error = new InvalidWiringFilesError({ indexes })
  const failure = Effect.fail(error)

  return Effect.runSync(failure)
}

const makeWiringEntryInput = <E>(entry: Pick<WiringEntryInput<E>, "files" | "wiring">) =>
  new WiringEntryInput<E>({ files: entry.files, wiring: entry.wiring })

const isValidWiringFilesInput = (entry: WiringFilesInput) => {
  const hasFiles = entry.files.length > 0
  const hasOnlyNonEmptyPatterns = Array.every(entry.files, isFileGlob)
  const conditions = Array.make(hasFiles, hasOnlyNonEmptyPatterns)

  return Array.every(conditions, Boolean)
}

const compileEntryGlobs = <E>(entry: WiringEntryInput<E>) => {
  Array.forEach(entry.files, compileGlobPattern)
  const wiring = makeWiring(entry.wiring)

  return new WiringEntry<E>({
    files: entry.files,
    wiring
  })
}

const invalidConfigIndex = (entry: WiringEntryInput<unknown>, index: number) => {
  const filesInput = new WiringFilesInput({ files: entry.files })
  const isValid = isValidWiringFilesInput(filesInput)

  return isValid ? Result.failVoid : Result.succeed(index)
}

const entryPolicies = (entry: WiringEntry<unknown>) => entry.wiring.policies

// Glob compilation happens at config load because invalid patterns must not fail mid-analysis.
export const defineConfig = <
  const Inputs extends ReadonlyArray<Pick<WiringEntryInput<unknown>, "files" | "wiring">>
>(
  config: Inputs
): WiringConfig<WiringError<Inputs[number]["wiring"]>> => {
  type E = WiringError<Inputs[number]["wiring"]>
  const inputs = Array.map(config, makeWiringEntryInput)
  const invalidIndexes = Array.filterMap(inputs, invalidConfigIndex)

  if (invalidIndexes.length > 0) {
    return failInvalidWiringFiles(invalidIndexes)
  }

  const entries = Array.map(inputs, compileEntryGlobs)
  const policies = Array.flatMap(entries, entryPolicies)
  const validatedEntries = validatePolicyNames(policies, entries)

  return validatedEntries as WiringConfig<E>
}

export const loadWiringConfig: (
  projectDirectory: string,
  fallback: WiringConfig<unknown>
) => Effect.Effect<WiringConfig<unknown>, ProjectWiringConfigError> = Effect.fn(
  "WiringConfig.load"
)(function* (projectDirectory: string, fallback: WiringConfig<unknown>) {
  // ConfigExportName is accepted export-name protocol because authors must agree.
  type ConfigExportName = "default" | "config"
  // UnknownRecord is decoded module shape because config loading inspects plain exports.
  type UnknownRecord = Readonly<Record<string, unknown>>

  // ConfigExport pairs export name with raw value because discovery exchanges both.
  class ConfigExport extends Data.Class<{
    readonly name: ConfigExportName
    readonly value: unknown
  }> {}

  // ErrorLike is a message-bearing failure because loaders normalize thrown values.
  class ErrorLike {
    constructor(readonly message: string) {}
  }

  const defaultExportName = "default"
  const configExportName = "config"
  const isFunctionType = strictEqual("function")
  const isObjectType = strictEqual("object")
  const isStringType = strictEqual("string")
  const errorMessage = Struct.get<ErrorLike, "message">("message")

  const isRecord = (value: unknown): value is UnknownRecord => {
    const isObject = isObjectType(typeof value)
    const isNonNull = value !== null
    const conditions = Array.make(isObject, isNonNull)

    return Array.every(conditions, Boolean)
  }

  const isCallable = (value: unknown): value is () => unknown => isFunctionType(typeof value)

  const makeConfigExport = (name: ConfigExportName) => (value: unknown) =>
    new ConfigExport({ name, value })

  const ownConfigExport =
    (name: ConfigExportName) => (valueFromRecord: (record: UnknownRecord) => unknown) => {
      const recordHasOwnName = (candidate: UnknownRecord) => Object.hasOwn(candidate, name)

      return flow(
        Option.liftPredicate(recordHasOwnName),
        Option.map(valueFromRecord),
        Option.map(makeConfigExport(name))
      )
    }

  const defaultConfigExport = makeConfigExport(defaultExportName)

  const hasMessageProperty = (record: UnknownRecord): record is UnknownRecord & ErrorLike => {
    const hasMessage = Predicate.hasProperty(record, "message")
    const messageValue = hasMessage ? Reflect.get(record, "message") : null
    const messageType = typeof messageValue
    const messageIsString = isStringType(messageType)

    return hasMessage && messageIsString
  }

  const isErrorLike = (value: unknown): value is ErrorLike =>
    pipe(Option.liftPredicate(isRecord)(value), Option.exists(hasMessageProperty))

  const hasText = (value: string) => value.length > 0

  const formatCause = (cause: unknown) => {
    const fallbackText = String(cause)

    return pipe(
      Option.liftPredicate(isErrorLike)(cause),
      Option.map(errorMessage),
      Option.filter(hasText),
      Option.getOrElse(Function.constant(fallbackText))
    )
  }

  const failConfig = Effect.fn("WiringConfig.failConfig")(function* (
    configPath: string,
    reason: string
  ) {
    const error = new ProjectWiringConfigError({ configPath, reason })

    return yield* Effect.fail(error)
  })

  // --- project decode / export resolution because loadWiringConfig owns one config authoring SM ---

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

    const failMissingExport = Effect.fn("WiringConfig.failMissingExport")(function* () {
      return yield* failConfig(
        configPath,
        "config must export a default configuration or named config"
      )
    })

    return yield* pipe(
      exportOption,
      Option.match({
        onNone: failMissingExport,
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

  const resolvedExport = Effect.fn("WiringConfig.resolvedExport")(function* (
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

  const invalidPolicy = (value: unknown) => !isWiringPolicyInstance(value)

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

    return value as ReadonlyArray<WiringPolicy>
  })

  const validateWiringShape = Effect.fn("WiringConfig.validateWiringShape")(function* (
    configPath: string,
    fieldPath: string,
    value: unknown
  ) {
    if (!isRecord(value)) {
      return yield* failConfig(
        configPath,
        `${fieldPath} must be an object with policies and derive`
      )
    }

    const policiesPath = `${fieldPath}.policies`
    const policies = yield* validatePolicies(configPath, policiesPath, value.policies)

    if (!isFunctionType(typeof value.derive)) {
      return yield* failConfig(configPath, `${fieldPath}.derive must be a function`)
    }

    return new Wiring<unknown>({
      policies,
      derive: value.derive as Wiring<unknown>["derive"]
    })
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

    const validateEntryAt = Effect.fn("WiringConfig.validateEntryAt")(function* (
      entry: unknown,
      index: number
    ) {
      return yield* validateWiringEntry(configPath, entry, index)
    })

    const entries: ReadonlyArray<Pick<WiringEntry<unknown>, "files" | "wiring">> =
      yield* Effect.forEach(value, validateEntryAt)

    return yield* Effect.try({
      try: () => defineConfig(entries),
      catch: (cause) => {
        const reason = formatCause(cause)

        return new ProjectWiringConfigError({ configPath, reason })
      }
    })
  })

  // Decoding stays filesystem-free because config loading must have one validation path.
  const decodeWiringConfig: (
    configPath: string,
    moduleValue: unknown
  ) => Effect.Effect<WiringConfig<unknown>, ProjectWiringConfigError> = Effect.fn(
    "WiringConfig.decode"
  )(function* (configPath: string, moduleValue: unknown) {
    const exportValue = yield* resolvedExport(configPath, moduleValue)

    return yield* validateWiringConfig(configPath, exportValue)
  })

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

  const configPath = path.resolve(projectDirectory, "better-typescript.config.ts")
  const exists = yield* Effect.sync(() => fs.existsSync(configPath))
  const missingConfig = !exists

  if (missingConfig) {
    return fallback
  }

  return yield* loadExistingWiringConfig(configPath)
})
