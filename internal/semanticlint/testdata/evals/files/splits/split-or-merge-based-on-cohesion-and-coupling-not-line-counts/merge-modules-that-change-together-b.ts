type LineItem = Readonly<{
  unitPriceCents: number
  quantity: number
}>

export const calculateCheckoutTotal = (
  lines: readonly LineItem[],
  taxRate: number,
): number => {
  const subtotalCents = lines.reduce(
    (total, line) => total + line.unitPriceCents * line.quantity,
    0,
  )
  const taxCents = subtotalCents * taxRate

  return subtotalCents + taxCents
}
