import { Array, Effect, Function, Option, Predicate, Struct, flow, pipe } from "effect"
import { strictEqual } from "../../engine/equivalence.js"
import { ConfigExport, type ConfigExportName, ProjectWiringConfigError } from "./data.js"

const defaultExportName = "default"
const configExportName = "config"
const isFunctionType = strictEqual("function")
const isObjectType = strictEqual("object")
const isStringType = strictEqual("string")

export const failConfig = Effect.fn("WiringConfig.failConfig")(function* (
  configPath: string,
  reason: string
) {
  const error = new ProjectWiringConfigError({ configPath, reason })

  return yield* Effect.fail(error)
})

// UnknownRecord is decoded module shape because config loading inspects plain exports.
export type UnknownRecord = Readonly<Record<string, unknown>>

// ErrorLike is a message-bearing failure because loaders normalize thrown values.
class ErrorLike {
  constructor(readonly message: string) {}
}

export const isRecord = (value: unknown): value is UnknownRecord => {
  const isObject = isObjectType(typeof value)
  const isNonNull = value !== null
  const conditions = Array.make(isObject, isNonNull)

  return Array.every(conditions, Boolean)
}

export const isCallable = (value: unknown): value is () => unknown => isFunctionType(typeof value)

const errorMessage = Struct.get<ErrorLike, "message">("message")

const hasMessageProperty = (cause: UnknownRecord): cause is UnknownRecord & ErrorLike => {
  const hasMessage = Predicate.hasProperty(cause, "message")
  const messageValue = hasMessage ? Reflect.get(cause, "message") : null
  const messageIsString = isStringType(typeof messageValue)

  return hasMessage && messageIsString
}

const isErrorLike = (cause: unknown): cause is ErrorLike =>
  pipe(Option.liftPredicate(isRecord)(cause), Option.exists(hasMessageProperty))

const hasText = (value: string) => value.length > 0

// The loader shell reuses this formatter because module-load failures render like decode failures.
export const formatCause = (cause: unknown) => {
  const fallbackText = String(cause)

  return pipe(
    Option.liftPredicate(isErrorLike)(cause),
    Option.map(errorMessage),
    Option.filter(hasText),
    Option.getOrElse(Function.constant(fallbackText))
  )
}

const makeConfigExport = (name: ConfigExportName) => (value: unknown) =>
  new ConfigExport({ name, value })

const defaultConfigExport = makeConfigExport(defaultExportName)

const ownConfigExport =
  (name: ConfigExportName) => (valueFromRecord: (record: UnknownRecord) => unknown) => {
    const recordHasOwnName = (candidate: UnknownRecord) => Object.hasOwn(candidate, name)

    return flow(
      Option.liftPredicate(recordHasOwnName),
      Option.map(valueFromRecord),
      Option.map(makeConfigExport(name))
    )
  }

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

export { isFunctionType, isObjectType, isStringType }
