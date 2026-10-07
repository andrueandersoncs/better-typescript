type Product = {
  readonly sku: string
  readonly available: boolean
}

const availabilityText = (available: boolean): string => {
  return available ? "available" : "unavailable"
}

const renderProduct = (product: Product): string => {
  const state = availabilityText(product.available)
  return `${product.sku}:${state}`
}

const featuredProduct: Product = { sku: "PEN-1", available: true }
const renderedProduct = renderProduct(featuredProduct)

void renderedProduct
