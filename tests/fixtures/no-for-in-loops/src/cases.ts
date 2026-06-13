export {}

function sumRecord(record: Record<string, number>): number {
  let total = 0

  for (const key in record) {
    total += record[key]
  }

  return total
}

function copyRecord(record: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {}

  for (const key in record) {
    result[key] = record[key]
  }

  return result
}

function recordOperationsAreAllowed(record: Record<string, number>): number {
  return Object.entries(record)
    .map(([, value]) => value * 2)
    .reduce((left, right) => left + right, 0)
}
