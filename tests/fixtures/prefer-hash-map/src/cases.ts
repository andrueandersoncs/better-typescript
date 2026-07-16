export {}

const counts = new Map([ // ~detect 16
  ["a", 1],
  ["b", 2]
])

const empty = new Map<string, number>() // ~detect 15

const typed: Map<string, number> = new Map([["a", 1]]) // ~detect 14,36

const frozen: ReadonlyMap<string, number> = new Map([["a", 1]]) // ~detect 15,45

const lookupValue = (
  items: Map<string, number>, // ~detect 10
  key: string
): number | undefined => items.get(key)

const sizeOf = (items: ReadonlyMap<string, number>): number => items.size // ~detect 24
