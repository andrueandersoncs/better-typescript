export {}

function recordOperationsAreAllowed(record: Record<string, number>): number {
  return Object.entries(record)
    .map(([, value]) => value * 2)
    .reduce((left, right) => left + right, 0)
}
