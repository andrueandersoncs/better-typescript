export {}

function collectValues(values: ReadonlyArray<number>): ReadonlyArray<number> {
  const result: Array<number> = []

  for (const value of values) {
    result.push(value * 2)
  }

  return result
}

async function collectAsyncValues(
  values: AsyncIterable<number>
): Promise<ReadonlyArray<number>> {
  const result: Array<number> = []

  for await (const value of values) {
    result.push(value)
  }

  return result
}

function collectionOperationsAreAllowed(record: Record<string, number>): number {
  return Object.values(record)
    .map((value) => value * 2)
    .reduce((left, right) => left + right, 0)
}
