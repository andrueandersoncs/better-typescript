export type CatalogItem = {
  readonly sku: string
  readonly title: string
}

export class CatalogTitleFormatter {
  public formatTitle(item: CatalogItem): string {
    return item.title.trim().toUpperCase()
  }
}

export const formatCatalogTitle = (item: CatalogItem): string => {
  const formatter = new CatalogTitleFormatter()
  return formatter.formatTitle(item)
}
