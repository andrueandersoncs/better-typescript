import { Effect } from "effect"
import { ShipmentRepository, CarrierClient } from "./services"
import type { Shipment, TrackingEvent } from "./model"

export interface TrackingSummary {
  readonly shipmentId: string
  readonly status: TrackingEvent["status"]
  readonly lastSeenAt: Date
  readonly eventCount: number
}

const latestEvent = (events: ReadonlyArray<TrackingEvent>): TrackingEvent | undefined =>
  events.reduce<TrackingEvent | undefined>(
    (latest, event) => (latest === undefined || event.at > latest.at ? event : latest),
    undefined,
  )

export const summarizeTracking = (shipmentId: string) =>
  Effect.gen(function* () {
    const shipments = yield* ShipmentRepository
    const carrier = yield* CarrierClient
    const shipment: Shipment = yield* shipments.findById(shipmentId)
    const events = yield* carrier.events(shipment.carrierCode, shipment.trackingNumber)
    const latest = latestEvent(events)
    return {
      shipmentId,
      status: latest?.status ?? "label_created",
      lastSeenAt: latest?.at ?? shipment.createdAt,
      eventCount: events.length,
    } satisfies TrackingSummary
  })
