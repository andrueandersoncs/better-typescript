type ReceiptWriter = {
  readonly save: (contents: string) => Promise<void>
}

type Invoice = {
  readonly id: string
  readonly amountCents: number
}

export const saveReceiptAndGetTotal = async (
  invoice: Invoice,
  receiptWriter: ReceiptWriter,
): Promise<number> => {
  const contents = `${invoice.id}:${invoice.amountCents}`
  await receiptWriter.save(contents)
  return invoice.amountCents
}
