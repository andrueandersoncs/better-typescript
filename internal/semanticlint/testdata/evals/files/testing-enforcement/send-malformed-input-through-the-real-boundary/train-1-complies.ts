import { describe, expect, it } from "vitest"
import { handleCreateShipment } from "../src/http/create-shipment.js"
import { planShipment } from "../src/plan-shipment.js"

const validBody = {
  orderId: "ord_42",
  destination: { country: "DE", postalCode: "10115" },
  parcels: [{ weightGrams: 1200 }]
}

describe("shipment creation", () => {
  it("plans a shipment for a valid request", async () => {
    const response = await handleCreateShipment(new Request("http://test/shipments", { method: "POST", body: JSON.stringify(validBody) }))
    expect(response.status).toBe(201)
  })

  it("rejects a parcel with negative weight", async () => {
    const body = { ...validBody, parcels: [{ weightGrams: -5 }] }
    const response = await handleCreateShipment(new Request("http://test/shipments", { method: "POST", body: JSON.stringify(body) }))
    expect(response.status).toBe(400)
  })

  it("splits heavy orders into multiple parcels", () => {
    const plan = planShipment({ ...validBody, parcels: [{ weightGrams: 40_000 }] })
    expect(plan.parcels.length).toBeGreaterThan(1)
  })
})
