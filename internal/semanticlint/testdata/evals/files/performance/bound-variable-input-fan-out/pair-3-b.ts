type Contact = {
  readonly id: string
  readonly phone: string
}

const sendReminder = async (contact: Contact): Promise<void> => {
  await fetch("https://sms.example/messages", {
    method: "POST",
    body: JSON.stringify({ to: contact.phone, template: "renewal" }),
  })
}

export const remindContacts = async (contacts: readonly Contact[]): Promise<void> => {
  for (const contact of contacts) {
    await sendReminder(contact)
  }
}
