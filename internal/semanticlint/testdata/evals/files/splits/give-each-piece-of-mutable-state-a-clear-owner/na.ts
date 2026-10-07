export type ShipmentId = string

export type ShipmentRoute = Readonly<{
  originCode: string
  destinationCode: string
}>

export type ShipmentWindow = Readonly<{
  startsAt: string
  endsAt: string
}>

export type ShipmentPlan = Readonly<{
  shipmentId: ShipmentId
  route: ShipmentRoute
  window: ShipmentWindow
}>
