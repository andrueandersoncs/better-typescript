type TaxRate = {
  country: string
  percentage: number
}

export function calculateTax(
  subtotal: number,
  rate: TaxRate,
): { subtotal: number; tax: number; total: number } {
  const tax = Math.round(subtotal * rate.percentage) / 100

  return {
    subtotal,
    tax,
    total: subtotal + tax,
  }
}
