type Meter = {
  readonly label: string
  readonly total: number
}

const summarize = (meters: ReadonlyArray<Meter>): ReadonlyArray<string> => {
  return meters
    .filter((meter) => meter.total > 0)
    .sort((left, right) => right.total - left.total)
    .map((meter) => `${meter.label}: ${meter.total}`)
}

const input: ReadonlyArray<Meter> = [
  { label: "north", total: 12 },
  { label: "south", total: 7 }
]

export const report = summarize(input)
