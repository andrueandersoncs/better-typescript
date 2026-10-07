type DeliveryState = "scheduled" | "delivered"

type Delivery = {
  readonly trackingId: string
}

export const scheduledState = (delivery: Delivery): DeliveryState =>
  "scheduled"

export const deliveredState = (delivery: Delivery): DeliveryState =>
  "delivered"

export const trackingLabel = (delivery: Delivery): string =>
  `Tracking ${delivery.trackingId}`
