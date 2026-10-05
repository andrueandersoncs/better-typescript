type Parcel = {
  readonly weight: number
  readonly region?: string
  readonly service: "air" | "ground"
}

type RateTable = ReadonlyMap<string, number>

export const priceParcel = (parcel: Parcel, rates: RateTable): number => {
  if (parcel.region === undefined || parcel.weight <= 0) {
    return 0
  }
  const rate = rates.get(parcel.region)
  if (rate === undefined) {
    return 0
  }
  if (parcel.service === "air") {
    return rate * parcel.weight + 12
  }
  return rate * parcel.weight
}
