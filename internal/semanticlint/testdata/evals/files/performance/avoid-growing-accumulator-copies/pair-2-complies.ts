type Shipment = { readonly id: string; readonly parcels: ReadonlyArray<string> }

export const listParcels = (shipments: ReadonlyArray<Shipment>): ReadonlyArray<string> =>
  shipments.flatMap((shipment) => shipment.parcels)
