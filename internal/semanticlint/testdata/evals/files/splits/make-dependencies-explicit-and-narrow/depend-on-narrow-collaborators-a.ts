type Clock = Readonly<{
  now: () => string
}>

type AuditLog = Readonly<{
  record: (event: string) => void
}>

type ApplicationContext = Readonly<{
  clock: Clock
  auditLog: AuditLog
}>

type InvoiceTimestamp = Readonly<{
  value: string
}>

export const timestampForInvoice = (
  context: ApplicationContext,
): InvoiceTimestamp => ({ value: context.clock.now() })

export const invoiceTimestampValueFor = (timestamp: InvoiceTimestamp): string =>
  timestamp.value
