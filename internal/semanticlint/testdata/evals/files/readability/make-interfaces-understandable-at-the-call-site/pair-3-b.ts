type MarkerPosition = {
  latitude: number
  longitude: number
  zoom: number
}

type MapMarker = MarkerPosition & {
  mapId: string
}

const placeMarker = (mapId: string, position: MarkerPosition): MapMarker => ({ mapId, ...position })

const marker = placeMarker("london", { latitude: 51.5072, longitude: -0.1276, zoom: 14 })
const markerLayer = "delivery-zones"

export { marker, markerLayer }
