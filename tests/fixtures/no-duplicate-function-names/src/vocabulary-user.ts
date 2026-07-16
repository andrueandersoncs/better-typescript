export {}

// Same name as vocabulary-account.ts#make, different signature: module vocabulary.
interface User {
  readonly name: string
}

export const make = (name: string): User => ({ name })

// Same name AND same signature as vocabulary-account.ts#slugify: a semantic duplicate.
export const slugify = (raw: string): string => raw.toLowerCase() // ~detect 14

// Same name as vocabulary-account.ts#describe, different arity: not a duplicate.
export const describe = (label: string): string => label
