export type Identity = {
  readonly accountId: string
  readonly isActive: boolean
}

export type Checkout = {
  readonly subtotalCents: number
}

export interface CheckoutApplication {
  createAuthorizedCheckout(identity: Identity, checkout: Checkout): Promise<string>
}

export const postCheckout = async (
  identity: Identity,
  subtotalCents: number,
  application: CheckoutApplication
): Promise<string> => {
  const checkout = { subtotalCents }

  return application.createAuthorizedCheckout(identity, checkout)
}
