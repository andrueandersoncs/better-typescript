export type Coordinate = {
  readonly latitude: number
  readonly longitude: number
}

export const formatCoordinate = (coordinate: Coordinate): string => {
  const latitude = coordinate.latitude.toFixed(4)
  const longitude = coordinate.longitude.toFixed(4)
  return `${latitude}, ${longitude}`
}

export const isNorthernHemisphere = (coordinate: Coordinate): boolean => {
  return coordinate.latitude >= 0
}
