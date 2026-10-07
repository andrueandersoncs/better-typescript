type Delivery = {
  readonly trackingId: string
  readonly carrier: string
}

export const deliveryLabel = (delivery: Delivery): string =>
  `${delivery.carrier}:${delivery.trackingId}`

export const hasTrackingId = (delivery: Delivery): boolean =>
  delivery.trackingId.length > 0

export const carrierLabel = (delivery: Delivery): string => delivery.carrier
