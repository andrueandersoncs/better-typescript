import { addDays, isBefore } from "date-fns"
import type { Invoice } from "./types"
import { sendEmail } from "../email/client"

export interface ReminderSettings {
  readonly graceDays: number
  readonly maxReminders: number
}

const formatAmount = (cents: number, currency: string): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100)

export const isOverdue = (invoice: Invoice, now: Date, settings: ReminderSettings): boolean =>
  isBefore(addDays(invoice.dueDate, settings.graceDays), now)

export async function sendReminder(
  invoice: Invoice,
  now: Date,
  settings: ReminderSettings,
): Promise<boolean> {
  if (invoice.status === "paid") {
    return false
  }
  if (isOverdue(invoice, now, settings)) {
    if (invoice.remindersSent >= settings.maxReminders) {
      return false
    }
    await sendEmail(invoice.customerEmail, {
      subject: `Invoice ${invoice.number} is overdue`,
      body: `Amount due: ${formatAmount(invoice.amountCents, invoice.currency)}`,
    })
    return true
  }
  return false
}
