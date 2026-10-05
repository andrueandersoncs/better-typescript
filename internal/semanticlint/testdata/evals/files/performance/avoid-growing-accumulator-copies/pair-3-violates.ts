type Reading = { readonly meterId: string; readonly value: number }

export const indexReadings = (
  readings: ReadonlyArray<Reading>
): Readonly<Record<string, number>> => {
  let readingsByMeter: Readonly<Record<string, number>> = {}
  for (const reading of readings) {
    readingsByMeter = { ...readingsByMeter, [reading.meterId]: reading.value }
  }
  return readingsByMeter
}
