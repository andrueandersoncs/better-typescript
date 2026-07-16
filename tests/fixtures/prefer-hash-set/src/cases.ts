export {}

const numbers = new Set([1, 2, 3]) // ~detect 17

const empty = new Set<string>() // ~detect 15

const typed: Set<number> = new Set([1, 2]) // ~detect 14,28

const frozen: ReadonlySet<string> = new Set(["a"]) // ~detect 15,37

const hasItem = (items: Set<number>, item: number): boolean => items.has(item) // ~detect 25

const count = (items: ReadonlySet<string>): number => items.size // ~detect 23
