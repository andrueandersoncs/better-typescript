type Invoice = {
  readonly id: string
  readonly recipient: string
}

const publish = async (invoice: Invoice): Promise<void> => {
  await fetch(`https://billing.example/invoices/${invoice.id}/publish`, {
    method: "POST",
    headers: { "x-recipient": invoice.recipient },
  })
}

export const publishInvoices = async (invoices: readonly Invoice[]): Promise<void> => {
  for (let start = 0; start < invoices.length; start += 8) {
    await Promise.all(invoices.slice(start, start + 8).map(publish))
  }
}
