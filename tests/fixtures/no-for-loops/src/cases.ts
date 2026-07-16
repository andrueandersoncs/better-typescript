export {}

function doubleValues(values: ReadonlyArray<number>): ReadonlyArray<number> {
  const result: Array<number> = []

  for (let index = 0; index < values.length; index += 1) { // ~detect 3
    result.push(values[index] * 2)
  }

  return result
}

function sumValues(values: ReadonlyArray<number>): number {
  let total = 0
  let index = 0

  for (; index < values.length; index += 1) { // ~detect 3
    total += values[index]
  }

  return total
}
