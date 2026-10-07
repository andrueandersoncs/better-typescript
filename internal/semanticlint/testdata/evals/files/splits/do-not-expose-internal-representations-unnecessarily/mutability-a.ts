type DeliveryNotice = Readonly<{
  orderId: string
  state: string
}>

export const createDeliveryNotice = (): DeliveryNotice => {
  const notice = {
    orderId: "order-42",
    state: "queued",
  }

  notice.state = "sent"

  return {
    orderId: notice.orderId,
    state: notice.state,
  }
}
