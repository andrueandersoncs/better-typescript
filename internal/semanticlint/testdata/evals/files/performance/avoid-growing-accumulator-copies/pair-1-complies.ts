type LineItem = { readonly sku: string; readonly units: number }

export const collectSkus = (items: ReadonlyArray<LineItem>): ReadonlyArray<string> =>
  items.map((item) => item.sku)
