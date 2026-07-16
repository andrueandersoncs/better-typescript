import { Effect, Stream } from "effect"

export const collectSignals: <A>(
  signals: Stream.Stream<A, Error>
) => Effect.Effect<ReadonlyArray<A>, Error> = Stream.runCollect

export const messageOf = (error: Error): string => error.message

export type Failure = Error | { readonly code: string }

export type QualifiedFailure = globalThis.Error

export interface ErrorSink {
  readonly push: (error: Error) => void
}
