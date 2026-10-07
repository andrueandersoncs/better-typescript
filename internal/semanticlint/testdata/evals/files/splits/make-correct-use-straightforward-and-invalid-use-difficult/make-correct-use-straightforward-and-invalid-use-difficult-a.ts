export type EmailAddress = string

export type Delivery = {
  readonly recipient: EmailAddress
  readonly subject: string
}

export const createDelivery = (
  recipient: EmailAddress,
  subject: string,
): Delivery => {
  return { recipient, subject }
}

export const formatRecipient = (delivery: Delivery): string => {
  return delivery.recipient.trim().toLowerCase()
}
