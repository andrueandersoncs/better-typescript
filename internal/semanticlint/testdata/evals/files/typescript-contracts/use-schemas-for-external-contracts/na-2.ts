type Window = {
  readonly start: number
  readonly end: number
}

const overlaps = (left: Window, right: Window): boolean => {
  return left.start < right.end && right.start < left.end
}

const morning: Window = { start: 9, end: 12 }
const afternoon: Window = { start: 13, end: 17 }

export const hasOverlap = overlaps(morning, afternoon)
