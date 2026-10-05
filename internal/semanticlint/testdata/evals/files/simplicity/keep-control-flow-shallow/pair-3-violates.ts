type Parcel = {
  readonly weight: number
  readonly region?: string
  readonly service: "air" | "ground"
}

type RateTable = ReadonlyMap<string, number>

export const priceParcel = (parcel: Parcel, rates: RateTable): number => {
  let price = 0
  if (parcel.region !== undefined) {
    if (parcel.weight > 0) {
      const rate = rates.get(parcel.region)
      if (rate !== undefined) {
        if (parcel.service === "air") {
          price = rate * parcel.weight + 12
        } else {
          price = rate * parcel.weight
        }
      }
    }
  }
  return price
}
