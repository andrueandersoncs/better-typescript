export {}

function collectionOperationsAreAllowed(
  record: Record<string, number>
): number {
  return Object.values(record)
    .map((value) => value * 2)
    .reduce((left, right) => left + right, 0)
}
