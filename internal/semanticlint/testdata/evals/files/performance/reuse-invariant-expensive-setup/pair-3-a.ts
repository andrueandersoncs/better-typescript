type Shipment = {
  readonly id: string
  readonly countryCode: string
}

type ShipmentLabel = Shipment & {
  readonly countryName: string
}

export const labelShipment = (shipment: Shipment): ShipmentLabel => {
  const countryNames = new Map([
    ["DE", "Germany"],
    ["FR", "France"],
    ["GB", "United Kingdom"],
  ])
  return { ...shipment, countryName: countryNames.get(shipment.countryCode) ?? shipment.countryCode }
}
