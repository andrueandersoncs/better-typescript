type Entry = {
  readonly amount: number
  readonly included: boolean
}

type Batch = {
  readonly enabled: boolean
  readonly entries: ReadonlyArray<Entry>
}

export const sumBatch = (batch: Batch | undefined): number => {
  let total = 0
  if (batch !== undefined) {
    if (batch.enabled) {
      if (batch.entries.length > 0) {
        for (const entry of batch.entries) {
          if (entry.included) {
            total += entry.amount
          }
        }
      }
    }
  }
  return total
}
