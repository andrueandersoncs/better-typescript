import { Effect, Stream } from "effect"

export const collectSignals: <A>(
  signals: Stream.Stream<A, Error> // ~detect 29
) => Effect.Effect<ReadonlyArray<A>, Error> = Stream.runCollect // ~detect 38

export const messageOf = (error: Error): string => error.message // ~detect 34

export type Failure = Error | { readonly code: string } // ~detect 23

export type QualifiedFailure = globalThis.Error // ~detect 43

export interface ErrorSink {
  readonly push: (error: Error) => void // ~detect 26
}
