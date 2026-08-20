import { Stream } from "effect"

export {}

function collectionOperationsAreAllowed(
  record: Record<string, number>
): number {
  return Object.values(record)
    .map((value) => value * 2)
    .reduce((left, right) => left + right, 0)
}

declare const asyncValues: AsyncIterable<number>

export const asyncCollectionOperationsAreAllowed = Stream.fromAsyncIterable(
  asyncValues,
  (cause) => cause
).pipe(
  Stream.map((value) => value * 2),
  Stream.runCollect
)
