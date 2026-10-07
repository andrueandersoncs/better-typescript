export type Price = {
  readonly cents: number
  readonly currency: string
}

const roundCents = (cents: number): number => Math.round(cents)

export const formatSubtotal = (price: Price): string => {
  const cents = roundCents(price.cents)
  const amount = (cents / 100).toFixed(2)
  return `${price.currency} ${amount}`
}

export const formatTotal = (price: Price): string => {
  const cents = roundCents(price.cents)
  const amount = (cents / 100).toFixed(2)
  return `${price.currency} ${amount}`
}
