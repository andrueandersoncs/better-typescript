type Receipt = { readonly token: string }
type Batch = { readonly id: string; readonly token: string; readonly receipts: ReadonlyArray<Receipt> }

export const countReceipts = (
  batches: ReadonlyArray<Batch>
): ReadonlyArray<number> => {
  const counts: Array<number> = []
  for (const batch of batches) {
    const count = batch.receipts.filter((receipt) => receipt.token === batch.token).length
    counts.push(count)
  }
  return counts
}
