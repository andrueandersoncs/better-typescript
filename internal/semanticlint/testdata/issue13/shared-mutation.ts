const shared: string[] = []

export const remember = (value: string): readonly string[] => {
  shared.push(value)
  return shared
}
