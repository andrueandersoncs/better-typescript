type Entry = {
  readonly amount: number
  readonly included: boolean
}

type Batch = {
  readonly enabled: boolean
  readonly entries: ReadonlyArray<Entry>
}

export const sumBatch = (batch: Batch | undefined): number => {
  if (batch === undefined || !batch.enabled || batch.entries.length === 0) {
    return 0
  }
  let total = 0
  for (const entry of batch.entries) {
    if (entry.included) {
      total += entry.amount
    }
  }
  return total
}
