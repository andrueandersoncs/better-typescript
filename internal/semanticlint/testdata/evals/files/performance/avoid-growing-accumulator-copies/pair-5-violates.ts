type Sample = { readonly value: number }

export const collectSamples = (samples: ReadonlyArray<Sample>): ReadonlyArray<number> => {
  let values: ReadonlyArray<number> = []
  for (const sample of samples) {
    values = [...values, sample.value]
  }
  return values
}
