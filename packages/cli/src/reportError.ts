import { Console, Effect, Function, Option, Predicate, Struct, pipe } from "effect"

const setErrorExitCode = () => {
  process.exitCode = 2

  return process.exitCode
}

// Failures narrow structurally because this untyped boundary must not name the built-in type.
const isMessageCarrier = (cause: unknown): cause is { readonly message: string } =>
  Predicate.hasProperty(cause, "message") && Predicate.isString(cause.message)

const hasText = (value: string) => value.length > 0

// Render unknown operational failures because the CLI boundary receives unknown errors.
const errorText = (error: unknown) => {
  const fallbackText = String(error)

  return pipe(
    Option.liftPredicate(isMessageCarrier)(error),
    Option.map(Struct.get("message")),
    Option.filter(hasText),
    Option.getOrElse(Function.constant(fallbackText))
  )
}

export const reportError = Effect.fn("Cli.reportError")(function* (error: unknown) {
  const text = errorText(error)

  yield* Console.error(`Error: ${text}`)
  yield* Effect.sync(setErrorExitCode)
})
