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
  if (selection === undefined || selection.minimum < 0) {
    return []
  }
  const ids: Array<string> = []
  for (const candidate of candidates) {
    if (candidate.score >= selection.minimum && candidate.tags.has(selection.tag)) {
      ids.push(candidate.id)
    }
  }
  return ids
}
