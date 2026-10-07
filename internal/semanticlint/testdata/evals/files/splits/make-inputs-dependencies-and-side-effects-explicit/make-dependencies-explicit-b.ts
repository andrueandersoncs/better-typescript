type Clock = {
  readonly now: () => Date
}

type Invoice = {
  readonly dueAt: Date
}

export const isOverdue = (invoice: Invoice, clock: Clock): boolean => {
  const currentTime = clock.now()
  return invoice.dueAt < currentTime
}

export const invoiceLabel = (invoice: Invoice): string =>
  invoice.dueAt.toISOString()
