type Shipment = {
  readonly id: string
  readonly countryCode: string
}

type ShipmentLabel = Shipment & {
  readonly countryName: string
}

const countryNames = new Map([
  ["DE", "Germany"],
  ["FR", "France"],
  ["GB", "United Kingdom"],
])

export const labelShipment = (shipment: Shipment): ShipmentLabel =>
  ({ ...shipment, countryName: countryNames.get(shipment.countryCode) ?? shipment.countryCode })
