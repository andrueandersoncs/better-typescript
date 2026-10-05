type Shipment = { readonly id: string; readonly parcels: ReadonlyArray<string> }

export const listParcels = (shipments: ReadonlyArray<Shipment>): ReadonlyArray<string> => {
  let parcels: ReadonlyArray<string> = []
  for (const shipment of shipments) {
    parcels = parcels.concat(shipment.parcels)
  }
  return parcels
}
