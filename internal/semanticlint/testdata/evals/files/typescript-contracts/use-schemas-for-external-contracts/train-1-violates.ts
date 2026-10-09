import { Effect, Schema } from "effect"
import { HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { ShipmentRepo } from "../ShipmentRepo"

export interface CarrierStatusWebhook {
  readonly trackingNumber: string
  readonly status: "in_transit" | "delivered" | "exception"
  readonly occurredAt: string
  readonly location?: string
}

const toShipmentState = (status: CarrierStatusWebhook["status"]) => {
  switch (status) {
    case "in_transit":
      return "shipping" as const
    case "delivered":
      return "complete" as const
    case "exception":
      return "attention" as const
  }
}

export const handleCarrierStatus = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest
  const body = (yield* request.json) as CarrierStatusWebhook
  const repo = yield* ShipmentRepo
  yield* repo.updateState(body.trackingNumber, {
    state: toShipmentState(body.status),
    at: new Date(body.occurredAt),
    location: body.location ?? null,
  })
  return HttpServerResponse.empty({ status: 204 })
})

export const CarrierAck = Schema.Struct({ received: Schema.Boolean })
