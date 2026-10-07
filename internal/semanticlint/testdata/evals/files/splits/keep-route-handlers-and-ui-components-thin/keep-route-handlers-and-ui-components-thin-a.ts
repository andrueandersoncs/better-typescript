export type Identity = {
  readonly accountId: string
  readonly isActive: boolean
}

export type Checkout = {
  readonly subtotalCents: number
  readonly discountPercent: number
}

export interface CheckoutApplication {
  createAuthorizedCheckout(identity: Identity, checkout: Checkout): Promise<string>
}

const calculatePromotionalDiscount = (subtotalCents: number): number =>
  subtotalCents >= 10_000 ? 10 : 0

export const postCheckout = async (
  identity: Identity,
  subtotalCents: number,
  application: CheckoutApplication
): Promise<string> => {
  const discountPercent = calculatePromotionalDiscount(subtotalCents)
  const checkout = { subtotalCents, discountPercent }

  return application.createAuthorizedCheckout(identity, checkout)
}
