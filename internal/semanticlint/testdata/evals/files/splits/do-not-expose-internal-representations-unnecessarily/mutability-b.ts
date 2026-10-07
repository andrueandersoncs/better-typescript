type DeliveryNotice = Readonly<{
  orderId: string
  state: string
}>

export const createDeliveryNotice = (): DeliveryNotice => {
  const orderId = "order-42"
  const state = "sent"

  return {
    orderId,
    state,
  }
}
