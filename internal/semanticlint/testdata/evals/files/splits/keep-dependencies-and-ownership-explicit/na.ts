export type TaxRate = {
  readonly percentage: number
}

export const calculateTax = (subtotalCents: number, rate: TaxRate): number => {
  const percentage = rate.percentage / 100
  const tax = subtotalCents * percentage
  return Math.round(tax)
}

export const calculateGrandTotal = (subtotalCents: number, rate: TaxRate): number => {
  const tax = calculateTax(subtotalCents, rate)
  return subtotalCents + tax
}
