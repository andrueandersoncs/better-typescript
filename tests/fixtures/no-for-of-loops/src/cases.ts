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

function loopsThatAreAllowed(record: Record<string, number>): number {
  let total = 0

  for (const key in record) {
    total += record[key] ?? 0
  }

  for (let index = 0; index < 3; index += 1) {
    total += index
  }

  return Object.values(record)
    .map((value) => value * 2)
    .reduce((left, right) => left + right, total)
}
