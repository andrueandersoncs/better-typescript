export type CatalogItem = {
  readonly sku: string
  readonly title: string
}

export class CatalogManager {
  public formatTitle(item: CatalogItem): string {
    return item.title.trim().toUpperCase()
  }

  public calculateStockValue(units: number, price: number): number {
    return units * price
  }

  public parseSku(input: string): string {
    return input.trim().toLowerCase()
  }
}
