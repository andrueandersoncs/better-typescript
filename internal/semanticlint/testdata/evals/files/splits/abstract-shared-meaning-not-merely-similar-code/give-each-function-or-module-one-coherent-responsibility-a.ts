export type Shipment = {
  readonly address: string
  readonly weightGrams: number
}

export class OperationsHelper {
  public formatAddress(address: string): string {
    return address.trim().toUpperCase()
  }

  public calculatePostage(weightGrams: number): number {
    return Math.ceil(weightGrams / 500) * 4
  }

  public parseShipment(value: string): Shipment {
    const [address, weight] = value.split("|")
    return { address, weightGrams: Number(weight) }
  }
}
