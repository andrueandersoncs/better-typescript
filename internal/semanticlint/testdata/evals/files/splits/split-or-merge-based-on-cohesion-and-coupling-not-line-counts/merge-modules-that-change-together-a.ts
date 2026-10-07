type LineItem = Readonly<{
  unitPriceCents: number
  quantity: number
}>

type TaxCalculator = Readonly<{
  calculate: (subtotalCents: number) => number
}>

export const createTaxCalculator = (rate: number): TaxCalculator => ({
  calculate: (subtotalCents) => subtotalCents * rate,
})

export const calculateSubtotalCents = (lines: readonly LineItem[]): number =>
  lines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0)

export const calculateCheckoutTotal = (
  subtotalCents: number,
  taxCents: number,
): number => subtotalCents + taxCents
