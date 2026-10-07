export class EmailAddress {
  private constructor(public readonly value: string) {}

  public static create(input: string): EmailAddress {
    const value = input.trim().toLowerCase()
    if (!value.includes("@")) throw new Error("An email address is required")
    return new EmailAddress(value)
  }
}

export type Delivery = {
  readonly recipient: EmailAddress
  readonly subject: string
}

export const createDelivery = (recipient: EmailAddress, subject: string): Delivery => {
  return { recipient, subject }
}
