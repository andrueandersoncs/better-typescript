export {}

const double = (n: number): number => { // ~detect 39
  return n * 2
}

const greet = (name: string): string => { // ~detect 41
  return `hi ${name}`
}

const makeUser = (id: number): { readonly id: number } => { // ~detect 59
  return { id }
}

const toText = (value: number): string => { // ~detect 43
  return String(value)
}

const sign = (n: number): string => { // ~detect 37
  return n >= 0 ? "pos" : "neg"
}
