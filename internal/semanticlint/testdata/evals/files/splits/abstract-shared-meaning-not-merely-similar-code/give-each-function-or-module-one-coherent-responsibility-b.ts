export type Shipment = {
  readonly address: string
  readonly weightGrams: number
}

export class ShipmentParser {
  public parseShipment(value: string): Shipment {
    const [address, weight] = value.split("|")
    return { address, weightGrams: Number(weight) }
  }
}

export const parseShipment = (value: string): Shipment => {
  const parser = new ShipmentParser()
  return parser.parseShipment(value)
}
