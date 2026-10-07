type Invoice = {
  readonly number: string
  readonly email: string
}

type Delivery = {
  readonly recipient: string
  readonly channel: "email" | "queue"
}

export const scheduleInvoice = (
  invoice: Invoice,
  sendEmail: boolean,
): Delivery => {
  if (sendEmail) {
    return { recipient: invoice.email, channel: "email" }
  }
  return { recipient: invoice.number, channel: "queue" }
}
