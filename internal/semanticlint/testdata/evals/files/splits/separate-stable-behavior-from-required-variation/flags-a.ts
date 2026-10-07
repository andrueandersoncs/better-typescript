type Shipment = {
  readonly reference: string
  readonly service: "standard" | "express"
}

export const createShipment = (
  reference: string,
  isExpress: boolean,
): Shipment => {
  if (isExpress) {
    return { reference, service: "express" }
  }
  return { reference, service: "standard" }
}

export const shipmentReference = (shipment: Shipment): string => {
  return shipment.reference
}
