import * as Effect from "effect/Effect"

export interface DeliveryWindow {
  readonly opensAt: string
  readonly closesAt: string
}

export const weekdayWindow: DeliveryWindow = {
  opensAt: "09:00",
  closesAt: "17:00"
}

export const deliveryService = Effect.succeed({ name: "DeliveryService" })
export const deliveryRegions = ["north", "south"] as const
