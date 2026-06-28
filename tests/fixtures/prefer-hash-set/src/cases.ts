export {}

const numbers = new Set([1, 2, 3])

const empty = new Set<string>()

const typed: Set<number> = new Set([1, 2])

const frozen: ReadonlySet<string> = new Set(["a"])

const hasItem = (items: Set<number>, item: number): boolean => items.has(item)

const count = (items: ReadonlySet<string>): number => items.size
