type Purchase = Readonly<{
  subtotalCents: number
}>

const minimumOrderCents = 2500
const minimumInvoiceCents = 2500

export const acceptsOrder = (purchase: Purchase): boolean =>
  purchase.subtotalCents >= minimumOrderCents

export const acceptsInvoice = (purchase: Purchase): boolean =>
  purchase.subtotalCents >= minimumInvoiceCents

export const purchaseSubtotalFor = (purchase: Purchase): number =>
  purchase.subtotalCents
