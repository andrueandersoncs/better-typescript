type Location = {
  readonly latitude: number
  readonly longitude: number
}

const rounded = (value: number): number =>
  Math.round(value * 1000) / 1000

export const formatLocation = (location: Location): string => {
  const latitude = rounded(location.latitude).toFixed(3)
  const longitude = rounded(location.longitude).toFixed(3)
  return `${latitude},${longitude}`
}
