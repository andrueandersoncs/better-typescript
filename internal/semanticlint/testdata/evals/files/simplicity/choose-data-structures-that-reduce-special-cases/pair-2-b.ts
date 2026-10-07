type Shipment = {
  orderId: string
  status: "awaiting-fulfillment" | "ready" | "in-transit" | "delivered" | "lost"
}

const messages = {
  "awaiting-fulfillment": "Awaiting fulfillment",
  ready: "Ready for pickup",
  "in-transit": "In transit",
  delivered: "Delivered",
  lost: "Shipment needs investigation",
} as const

export function shipmentMessage(shipment: Shipment): string {
  return messages[shipment.status]
}

export function canShip(shipment: Shipment): boolean {
  return shipment.status === "ready"
}

export function markShipped(shipment: Shipment): Shipment {
  return { ...shipment, status: "in-transit" }
}
