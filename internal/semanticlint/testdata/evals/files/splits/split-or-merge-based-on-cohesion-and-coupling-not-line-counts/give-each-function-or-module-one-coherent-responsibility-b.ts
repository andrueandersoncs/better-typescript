type Checkout = Readonly<{
  itemTotalCents: number
  shippingCents: number
  deliveryCity: string
}>

export const calculateCheckoutTotal = (checkout: Checkout): number =>
  checkout.itemTotalCents + checkout.shippingCents

export const shippingCostFor = (checkout: Checkout): number =>
  checkout.shippingCents

export const deliveryCityFor = (checkout: Checkout): string =>
  checkout.deliveryCity
