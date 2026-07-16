export {}

function collectValues(values: ReadonlyArray<number>): ReadonlyArray<number> {
  const result: Array<number> = []

  for (const value of values) { // ~detect 3
    result.push(value * 2)
  }

  return result
}

async function collectAsyncValues(
  values: AsyncIterable<number>
): Promise<ReadonlyArray<number>> {
  const result: Array<number> = []

  for await (const value of values) { // ~detect 3
    result.push(value)
  }

  return result
}
