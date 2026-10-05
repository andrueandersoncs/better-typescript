type Sample = { readonly value: number }

export const collectSamples = (
  samples: ReadonlyArray<Sample>,
  revisions: Array<ReadonlyArray<number>>
): ReadonlyArray<number> => {
  let values: ReadonlyArray<number> = []
  for (const sample of samples) {
    values = [...values, sample.value]
    revisions.push(values)
  }
  return values
}
