export const range = (count: number): ReadonlyArray<number> =>
  Array.from({ length: count }, (_, index) => index + 1)
