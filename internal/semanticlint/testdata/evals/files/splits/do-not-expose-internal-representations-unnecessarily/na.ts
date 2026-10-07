export type CatalogItemId = string

export type CatalogFilter = Readonly<{
  query: string
  pageSize: number
}>

export type CatalogPage = Readonly<{
  itemIds: readonly CatalogItemId[]
  nextPage: number | null
}>

export type CatalogSort = "name" | "newest"

export type CatalogQuery = Readonly<{
  filter: CatalogFilter
  sort: CatalogSort
}>
