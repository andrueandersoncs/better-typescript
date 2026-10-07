type Shipment = {
  trackingCode: string
  destination: string
}

const formatShipment = (shipment: Shipment) => {
  const trackingCode = shipment.trackingCode.trim().toUpperCase()

  const destination = shipment.destination.trim()

  const label = `${trackingCode} → ${destination}`

  return { trackingCode, destination, label }
}

export { formatShipment }
