it("formats a shipment time", () => {
  const shipment = {
    reference: "K-4",
    sentAt: new Date("2025-11-03T04:30:00.000Z")
  }
  const label = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(shipment.sentAt)

  if (shipment.reference !== "K-4") {
    throw new Error("unexpected reference")
  }

  if (label !== "4:30 AM") {
    throw new Error("unexpected time")
  }
})
