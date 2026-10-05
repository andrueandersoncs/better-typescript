type DeliverySettings = {
  readonly region: string
  readonly weekdayOnly: boolean
}

const deliverySettings: DeliverySettings = {
  region: "north-america",
  weekdayOnly: true
}

export const canDispatch = (day: number): boolean => {
  if (!deliverySettings.weekdayOnly) {
    return true
  }
  return day >= 1 && day <= 5
}

export const deliveryRegion = (): string => deliverySettings.region
