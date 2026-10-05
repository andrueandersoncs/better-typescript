type Summary = {
  readonly label: string
  readonly value: number
}

const percent = (value: number, total: number): string =>
  total === 0 ? "0%" : `${Math.round((value / total) * 100)}%`

export const summarize = (values: ReadonlyArray<number>): ReadonlyArray<Summary> => {
  const total = values.reduce((sum, value) => sum + value, 0)
  const highest = values.reduce((maximum, value) => Math.max(maximum, value), 0)

  return [
    { label: "Total", value: total },
    { label: percent(highest, total), value: highest }
  ]
}
