type ReminderOptions = {
  sendAt: string
  maxAttempts: number
  includeOverdue: boolean
}

type Reminder = ReminderOptions & {
  invoiceId: string
}

const createReminder = (invoiceId: string, options: ReminderOptions): Reminder => ({ invoiceId, ...options })

const reminder = createReminder("inv_82", {
  sendAt: "2026-10-15T09:00:00Z",
  maxAttempts: 3,
  includeOverdue: true,
})
const queueName = "billing-reminders"

export { queueName, reminder }
