import type { Db } from "../db"
import { sendReminderEmail } from "../mail"

export interface ReminderCandidate {
  readonly customerId: string
  readonly email: string
  readonly cartId: string
  readonly remindersSent: number
  readonly lastActivityAt: Date
}

const HOUR_MS = 60 * 60 * 1000

function hoursSince(date: Date, now: Date): number {
  return (now.getTime() - date.getTime()) / HOUR_MS
}

export function shouldRemind(candidate: ReminderCandidate, now: Date): boolean {
  if (hoursSince(candidate.lastActivityAt, now) < 24) return false
  // Marketing consent terms allow at most two reminders per abandoned cart;
  // a third email would breach the opt-in agreement with the customer.
  if (candidate.remindersSent >= 2) return false
  return true
}

export async function sendCartReminders(db: Db, now: Date): Promise<number> {
  const candidates = await db.abandonedCarts.findStale({ olderThanHours: 24 })
  let sent = 0
  for (const candidate of candidates) {
    if (!shouldRemind(candidate, now)) continue
    await sendReminderEmail(candidate.email, candidate.cartId)
    await db.abandonedCarts.incrementReminders(candidate.cartId)
    sent += 1
  }
  return sent
}
