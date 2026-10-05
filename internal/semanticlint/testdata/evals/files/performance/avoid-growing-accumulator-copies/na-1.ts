type Reading = { readonly meterId: string; readonly value: number }

export const totalReadings = (readings: ReadonlyArray<Reading>): number => {
  let total = 0
  for (const reading of readings) {
    total += reading.value
  }
  return total
}
