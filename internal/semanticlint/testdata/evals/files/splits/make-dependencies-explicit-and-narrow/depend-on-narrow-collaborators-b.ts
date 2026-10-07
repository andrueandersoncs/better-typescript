type Clock = Readonly<{
  now: () => string
}>

type InvoiceTimestamp = Readonly<{
  value: string
}>

export const timestampForInvoice = (clock: Clock): InvoiceTimestamp => ({
  value: clock.now(),
})

export const invoiceTimestampValueFor = (timestamp: InvoiceTimestamp): string =>
  timestamp.value
