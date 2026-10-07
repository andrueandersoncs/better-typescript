type OrderLine = Readonly<{
  sku: string
  quantity: number
}>

type Inventory = Readonly<{
  reserve: (lines: readonly OrderLine[]) => void
}>

type Billing = Readonly<{
  capture: (lines: readonly OrderLine[]) => void
}>

/**
 * Reserves inventory and captures payment for order lines.
 * It accepts collaborators and lines, returns no value, and reports no errors.
 */
export const placeOrder = (
  inventory: Inventory,
  billing: Billing,
  lines: readonly OrderLine[],
): void => {
  inventory.reserve(lines)
  billing.capture(lines)
}
