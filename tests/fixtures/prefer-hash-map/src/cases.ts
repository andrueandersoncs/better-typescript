export {}

const counts = new Map([["a", 1], ["b", 2]])

const empty = new Map<string, number>()

const typed: Map<string, number> = new Map([["a", 1]])

const frozen: ReadonlyMap<string, number> = new Map([["a", 1]])

const lookupValue = (items: Map<string, number>, key: string): number | undefined => items.get(key)

const sizeOf = (items: ReadonlyMap<string, number>): number => items.size
