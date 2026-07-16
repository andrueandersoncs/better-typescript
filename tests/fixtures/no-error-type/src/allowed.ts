import { Data, Effect, Stream } from "effect"

class ParseError extends Data.TaggedError("ParseError")<{
  readonly cause: unknown
}> {}

export const collectSignals: <A, E, R>(
  signals: Stream.Stream<A, E, R>
) => Effect.Effect<ReadonlyArray<A>, E, R> = Stream.runCollect

export const parseFailure = Effect.fail(
  new ParseError({ cause: "invalid input" })
)

type Error = { readonly message: string }

export const localFailure: Error = { message: "local" }

export const builtInErrorValue = new Error("runtime value")

export const builtInErrorConstructor: ErrorConstructor = Error

declare global {
  interface Error {
    readonly errorCode?: string
  }
}
