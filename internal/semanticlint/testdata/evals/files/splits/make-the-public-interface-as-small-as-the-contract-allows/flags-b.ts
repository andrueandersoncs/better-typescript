type Invoice = {
  readonly number: string
  readonly email: string
}

type Delivery = {
  readonly recipient: string
  readonly channel: "email" | "queue"
}

export const scheduleInvoice = (invoice: Invoice): Delivery => {
  return { recipient: invoice.email, channel: "email" }
}

export const queueInvoice = (invoice: Invoice): Delivery => {
  return { recipient: invoice.number, channel: "queue" }
}
