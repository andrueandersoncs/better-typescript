type Reading = { readonly meterId: string; readonly value: number }

export const indexReadings = (
  readings: ReadonlyArray<Reading>
): Readonly<Record<string, number>> =>
  Object.fromEntries(readings.map((reading) => [reading.meterId, reading.value]))
