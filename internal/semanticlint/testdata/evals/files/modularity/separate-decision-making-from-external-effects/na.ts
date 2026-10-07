type Coordinate = {
  latitude: number
  longitude: number
}

export function distanceLabel(from: Coordinate, to: Coordinate): string {
  const latitudeDelta = Math.abs(from.latitude - to.latitude)
  const longitudeDelta = Math.abs(from.longitude - to.longitude)
  const degrees = Math.sqrt(latitudeDelta ** 2 + longitudeDelta ** 2)

  if (degrees < 0.01) {
    return "nearby"
  }

  return `${degrees.toFixed(2)} degrees away`
}
