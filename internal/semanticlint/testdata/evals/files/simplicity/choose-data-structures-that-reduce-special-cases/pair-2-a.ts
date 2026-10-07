type Shipment = {
  orderId: string
  wasPacked: boolean
  wasShipped: boolean
  wasDelivered: boolean
  isLost: boolean
}

export function shipmentMessage(shipment: Shipment): string {
  if (shipment.isLost) {
    return "Shipment needs investigation"
  }

  if (shipment.wasDelivered) {
    return "Delivered"
  }

  if (shipment.wasShipped) {
    return "In transit"
  }

  if (shipment.wasPacked) {
    return "Ready for pickup"
  }

  return "Awaiting fulfillment"
}

export function canShip(shipment: Shipment): boolean {
  return shipment.wasPacked && !shipment.wasShipped && !shipment.isLost
}
