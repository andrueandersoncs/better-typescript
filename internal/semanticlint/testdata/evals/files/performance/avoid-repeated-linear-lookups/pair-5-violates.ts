type Batch = { readonly id: string; readonly token: string }
type Receipt = { readonly batchId: string; readonly token: string }

export const countReceipts = (
  batches: ReadonlyArray<Batch>,
  receipts: ReadonlyArray<Receipt>
): ReadonlyArray<number> => {
  const counts: Array<number> = []
  for (const batch of batches) {
    const count = receipts.filter((receipt) => receipt.token === batch.token).length
    counts.push(count)
  }
  return counts
}
