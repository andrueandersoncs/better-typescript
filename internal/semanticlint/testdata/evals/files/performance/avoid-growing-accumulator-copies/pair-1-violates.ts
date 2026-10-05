type LineItem = { readonly sku: string; readonly units: number }

export const collectSkus = (items: ReadonlyArray<LineItem>): ReadonlyArray<string> => {
  let skus: ReadonlyArray<string> = []
  for (const item of items) {
    skus = [...skus, item.sku]
  }
  return skus
}
