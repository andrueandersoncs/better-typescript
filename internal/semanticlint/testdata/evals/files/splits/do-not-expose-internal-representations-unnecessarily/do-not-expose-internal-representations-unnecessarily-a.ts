type ProductRecord = Readonly<{
  id: string
  displayName: string
  supplierCostCents: number
}>

const productRecord: ProductRecord = {
  id: "product-42",
  displayName: "Desk lamp",
  supplierCostCents: 1800,
}

export const findProduct = (): ProductRecord => productRecord
