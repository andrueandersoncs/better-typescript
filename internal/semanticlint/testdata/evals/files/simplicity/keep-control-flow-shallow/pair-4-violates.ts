type Candidate = {
  readonly id: string
  readonly score: number
  readonly tags: ReadonlySet<string>
}

type Selection = {
  readonly tag: string
  readonly minimum: number
}

export const selectIds = (
  candidates: ReadonlyArray<Candidate>,
  selection: Selection | undefined
): ReadonlyArray<string> => {
  const ids: Array<string> = []
  if (selection !== undefined) {
    if (selection.minimum >= 0) {
      for (const candidate of candidates) {
        if (candidate.score >= selection.minimum) {
          if (candidate.tags.has(selection.tag)) {
            ids.push(candidate.id)
          }
        }
      }
    }
  }
  return ids
}
