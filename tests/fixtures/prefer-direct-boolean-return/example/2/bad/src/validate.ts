declare const isValid: (input: string) => boolean
declare const parse: (input: string) => unknown
declare const hasRequiredFields: (parsed: unknown) => boolean

export const isUsable = (input: string): boolean => {
  if (isValid(input)) {
    const parsed = parse(input)
    return hasRequiredFields(parsed)
  }
  return false
}
