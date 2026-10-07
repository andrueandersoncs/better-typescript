type Shipment = {
  readonly reference: string
  readonly service: "standard" | "express"
}

export const createStandardShipment = (reference: string): Shipment => {
  return { reference, service: "standard" }
}

export const createExpressShipment = (reference: string): Shipment => {
  return { reference, service: "express" }
}

export const shipmentReference = (shipment: Shipment): string => {
  return shipment.reference
}
