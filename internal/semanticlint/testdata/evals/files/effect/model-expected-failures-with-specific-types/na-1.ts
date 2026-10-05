type Reminder = {
  readonly id: string
  readonly title: string
  readonly dueAt: Date
}

type ReminderRow = {
  readonly id: string
  readonly title: string
  readonly due: string
}

export const toReminderRows = (reminders: ReadonlyArray<Reminder>): ReadonlyArray<ReminderRow> =>
  reminders.map((reminder) => ({
    id: reminder.id,
    title: reminder.title,
    due: reminder.dueAt.toISOString().slice(0, 10)
  }))
