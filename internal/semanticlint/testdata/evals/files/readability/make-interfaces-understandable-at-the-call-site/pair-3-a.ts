type MapMarker = {
  mapId: string
  latitude: number
  longitude: number
  zoom: number
}

const placeMarker = (
  mapId: string,
  latitude: number,
  longitude: number,
  zoom: number,
): MapMarker => ({ mapId, latitude, longitude, zoom })

const marker = placeMarker("london", 51.5072, -0.1276, 14)
const markerLayer = "delivery-zones"

export { marker, markerLayer }
