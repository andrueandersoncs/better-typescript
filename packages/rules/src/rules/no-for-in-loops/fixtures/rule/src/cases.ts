export {}

function sumRecord(record: Record<string, number>): number {
  let total = 0

  for (const key in record) { // ~detect 3
    total += record[key]
  }

  return total
}

function copyRecord(record: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {}

  for (const key in record) { // ~detect 3
    result[key] = record[key]
  }

  return result
}
