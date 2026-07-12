declare const isValid: (input: string) => boolean
declare const parse: (input: string) => unknown
declare const hasRequiredFields: (parsed: unknown) => boolean

export const isUsable = (input: string): boolean => {
  const parsed = parse(input)

  return isValid(input) && hasRequiredFields(parsed)
}
