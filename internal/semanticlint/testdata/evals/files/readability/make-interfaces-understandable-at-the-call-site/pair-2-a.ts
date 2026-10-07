type Reminder = {
  invoiceId: string
  sendAt: string
  maxAttempts: number
  includeOverdue: boolean
}

const createReminder = (
  invoiceId: string,
  sendAt: string,
  maxAttempts: number,
  includeOverdue: boolean,
): Reminder => ({ invoiceId, sendAt, maxAttempts, includeOverdue })

const reminder = createReminder("inv_82", "2026-10-15T09:00:00Z", 3, true)
const queueName = "billing-reminders"

export { queueName, reminder }
