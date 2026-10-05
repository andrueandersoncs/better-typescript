type Session = {
  readonly accountId: string
  readonly accessKey: string
}

const audit = (event: string, fields: Record<string, unknown>): void => {
  console.info(event, fields)
}

export const beginCheckout = (session: Session, cartId: string): void => {
  audit("checkout_started", {
    cartId,
    accountId: session.accountId,
    accessKey: session.accessKey
  })
}
