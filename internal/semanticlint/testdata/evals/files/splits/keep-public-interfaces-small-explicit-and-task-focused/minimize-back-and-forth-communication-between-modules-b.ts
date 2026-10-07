type OrderLine = Readonly<{
  sku: string
  quantity: number
}>

type Ordering = Readonly<{
  place: (lines: readonly OrderLine[]) => void
}>

/**
 * Places an order through the ordering boundary.
 * It accepts an ordering collaborator and lines, returns no value, and reports no errors.
 */
export const placeOrder = (
  ordering: Ordering,
  lines: readonly OrderLine[],
): void => {
  ordering.place(lines)
}
