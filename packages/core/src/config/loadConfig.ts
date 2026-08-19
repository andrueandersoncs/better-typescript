import * as fs from "node:fs"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import { Effect, Function, Option, Predicate, Schema, Tuple, pipe } from "effect"
import { LintConfig, defaultConfig } from "./config.js"

// InvalidLintConfigError keeps the config path because users must know which executable file failed.
export class InvalidLintConfigError extends Schema.TaggedErrorClass<InvalidLintConfigError>()(
  "InvalidLintConfigError",
  {
    configPath: Schema.String,
    reason: Schema.String
  }
) {
  get message(): string {
    return `Invalid better-typescript.config.ts at ${this.configPath}: ${this.reason}`
  }
}

const exportValue =
  <Name extends "config" | "default">(name: Name) =>
  (moduleRecord: { readonly [Key in Name]: unknown }) =>
    Option.fromNullishOr(moduleRecord[name])

const configExport =
  <Name extends "config" | "default">(name: Name) =>
  (moduleValue: unknown) =>
    pipe(
      moduleValue,
      Option.liftPredicate(Predicate.hasProperty(name)),
      Option.flatMap(exportValue(name))
    )

const exportedConfig = (moduleValue: unknown) => {
  const namedConfig = configExport("config")(moduleValue)
  const defaultExport = configExport("default")(moduleValue)

  return pipe(namedConfig, Option.orElse(Function.constant(defaultExport)))
}

const decodeLintConfig = Schema.decodeUnknownEffect(LintConfig)

const parseReadonlyLintConfig = Effect.fn("LintConfig.parse")(function* (
  input: readonly [configPath: string, value: unknown]
) {
  const configPath = Tuple.get(input, 0)
  const value = Tuple.get(input, 1)

  const makeInvalidConfigError = (cause: unknown) => {
    const reason = String(cause)

    return new InvalidLintConfigError({ configPath, reason })
  }

  const decodedConfig = decodeLintConfig(value)

  return yield* pipe(decodedConfig, Effect.mapError(makeInvalidConfigError))
})

export const loadConfig = Effect.fn("LintConfig.load")(function* (projectPath: string) {
  const configPath = path.resolve(projectPath, "better-typescript.config.ts")
  const exists = yield* Effect.sync(() => fs.existsSync(configPath))

  if (!exists) {
    return defaultConfig
  }

  const configUrl = pathToFileURL(configPath).href
  const importModule = () => import(configUrl)

  const importFailure = (cause: unknown) => {
    const reason = String(cause)

    return new InvalidLintConfigError({ configPath, reason })
  }

  const moduleValue = yield* Effect.tryPromise({ try: importModule, catch: importFailure })
  const configValue = exportedConfig(moduleValue)

  if (Option.isNone(configValue)) {
    return yield* new InvalidLintConfigError({
      configPath,
      reason: "Config must provide a default export or named config export"
    })
  }

  const configInput = Tuple.make(configPath, configValue.value)

  return yield* parseReadonlyLintConfig(configInput)
})
