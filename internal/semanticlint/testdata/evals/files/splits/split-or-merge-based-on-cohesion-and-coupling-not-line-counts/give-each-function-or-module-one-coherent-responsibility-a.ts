type Checkout = Readonly<{
  itemTotalCents: number
  shippingCents: number
  deliveryCity: string
}>

type CheckoutResult = Readonly<{
  totalCents: number
  deliveryLabel: string
}>

export const calculateCheckoutTotalAndFormatDeliveryLabel = (
  checkout: Checkout,
): CheckoutResult => ({
  totalCents: checkout.itemTotalCents + checkout.shippingCents,
  deliveryLabel: `Delivery to ${checkout.deliveryCity}`,
})

export const shippingCostFor = (checkout: Checkout): number =>
  checkout.shippingCents

export const deliveryCityFor = (checkout: Checkout): string =>
  checkout.deliveryCity
