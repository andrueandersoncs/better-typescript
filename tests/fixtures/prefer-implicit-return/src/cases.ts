export {}

const double = (n: number): number => {
  return n * 2
}

const greet = (name: string): string => {
  return `hi ${name}`
}

const makeUser = (id: number): { readonly id: number } => {
  return { id }
}

const toText = (value: number): string => {
  return String(value)
}

const sign = (n: number): string => {
  return n >= 0 ? "pos" : "neg"
}
