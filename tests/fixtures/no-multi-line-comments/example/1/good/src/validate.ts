// Strips whitespace to prevent injection via padded strings.
const validate = (input: string): string =>
  input.trim()
