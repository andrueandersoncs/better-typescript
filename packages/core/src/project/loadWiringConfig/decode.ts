import { Array, Effect, Option, Predicate, pipe } from "effect"
import { Wiring, WiringEntry, type WiringConfig } from "../../engine/wiring/data.js"
import { defineConfig, isFileGlob } from "../../engine/wiring/wiring.js"
import {
  failConfig,
  formatCause as formatCauseImpl,
  isFunctionType,
  isRecord,
  makeProjectWiringConfigError as makeProjectWiringConfigErrorImpl,
  resolvedExport
} from "./decodeExport.js"
import { validatePolicies } from "./decodePolicy.js"
import type { ProjectWiringConfigError } from "./data.js"

export const formatCause = formatCauseImpl
export const makeProjectWiringConfigError = makeProjectWiringConfigErrorImpl

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

  const derive = value.derive as Wiring["derive"]

  return new Wiring({ policies, derive })
})

const isUnknownArray: (value: unknown) => value is ReadonlyArray<unknown> = Array.isArray

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

  const record = recordOption.value

  const filesOption = pipe(
    record.files,
    Option.liftPredicate(isUnknownArray),
    Option.filter(isNonEmptyFileGlobArray)
  )

  if (Option.isNone(filesOption)) {
    return yield* failConfig(
      configPath,
      `${fieldPath}.files must be a non-empty array of non-empty glob strings`
    )
  }

  const files = filesOption.value
  const wiringPath = `${fieldPath}.wiring`
  const wiring = yield* validateWiringShape(configPath, wiringPath, record.wiring)

  return new WiringEntry({ files, wiring })
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

      return makeProjectWiringConfigError(configPath, reason)
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
