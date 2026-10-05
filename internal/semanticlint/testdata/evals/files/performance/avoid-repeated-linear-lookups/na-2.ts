type Segment = { readonly name: string; readonly size: number }

export const formatSegments = (segments: ReadonlyArray<Segment>): ReadonlyArray<string> =>
  segments.map((segment) => `${segment.name}: ${segment.size}`)
