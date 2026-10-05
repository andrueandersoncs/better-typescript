type Segment = {
  readonly start: number
  readonly end: number
}

const overlaps = (left: Segment, right: Segment): boolean =>
  left.start < right.end && right.start < left.end

export const mergeSegments = (segments: ReadonlyArray<Segment>): ReadonlyArray<Segment> => {
  return segments.reduce<Array<Segment>>((merged, segment) => {
    const last = merged.at(-1)
    return last !== undefined && overlaps(last, segment)
      ? [...merged.slice(0, -1), { start: last.start, end: Math.max(last.end, segment.end) }]
      : [...merged, segment]
  }, [])
}
