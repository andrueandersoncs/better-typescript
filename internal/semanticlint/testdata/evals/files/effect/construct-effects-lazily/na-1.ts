type Entry = {
  readonly code: string
  readonly value: number
}

const byCode = (left: Entry, right: Entry): number =>
  left.code.localeCompare(right.code)

export const summarizeEntries = (entries: ReadonlyArray<Entry>) => {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0)
  return {
    count: entries.length,
    total,
    ordered: [...entries].sort(byCode)
  }
}
