export const build = (
  values: readonly string[],
): Readonly<Record<string, true>> => {
  const result: Record<string, true> = {}
  for (const value of values) {
    result[value] = true
  }
  return result
}
