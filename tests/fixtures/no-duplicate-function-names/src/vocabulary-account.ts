export {}

// Same name as vocabulary-user.ts#make, different signature: module vocabulary.
interface Account {
  readonly id: number
}

export const make = (id: number): Account => ({ id })

// Same name AND same signature as vocabulary-user.ts#slugify: a semantic duplicate.
export const slugify = (raw: string): string => raw.toLowerCase()

// Same name as vocabulary-user.ts#describe, different arity: not a duplicate.
export const describe = (label: string, detail: string): string =>
  `${label}: ${detail}`
