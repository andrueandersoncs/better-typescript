type Range = {
  readonly start: number
  readonly end: number
}

export const contains = (range: Range, value: number): boolean => {
  return value >= range.start && value <= range.end
}
