type HeaderBag = Readonly<Record<string, string | undefined>>

type Delivery = {
  readonly id: string
  readonly headers: HeaderBag
}

const report = (name: string, fields: Record<string, unknown>): void => {
  console.warn(name, fields)
}

export const receiveDelivery = (delivery: Delivery): void => {
  const apiKey = delivery.headers["x-api-key"]
  report("delivery_received", {
    deliveryId: delivery.id,
    apiKey
  })
}
