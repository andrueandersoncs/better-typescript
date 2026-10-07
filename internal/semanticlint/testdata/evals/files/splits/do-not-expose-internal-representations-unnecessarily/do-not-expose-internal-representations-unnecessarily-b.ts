type ProductRecord = Readonly<{
  id: string
  displayName: string
  supplierCostCents: number
}>

type ProductSummary = Readonly<{
  id: string
  displayName: string
}>

const productRecord: ProductRecord = {
  id: "product-42",
  displayName: "Desk lamp",
  supplierCostCents: 1800,
}

export const findProduct = (): ProductSummary => ({
  id: productRecord.id,
  displayName: productRecord.displayName,
})
