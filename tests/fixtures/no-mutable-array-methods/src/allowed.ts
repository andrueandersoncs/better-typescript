export {}

// immutable methods on real array
const numbers: number[] = [1, 2, 3]
const mapped = numbers.map((n: number) => n + 1)
const filtered = numbers.filter((n: number) => n > 0)
const sliced = numbers.slice(1)
const concatenated = numbers.concat(4)

// same-named method on non-array object/class
const fakeStack = { push: (value: number): void => {} }
fakeStack.push(1)

class InPlaceSorter { sort(): void {} }
new InPlaceSorter().sort()

// other collections' mutators
const ids = new Set<number>()
ids.add(1)

const lookup = new Map<string, number>()
lookup.set("a", 1)

// ReadonlyArray used immutably
const readonlyNumbers: ReadonlyArray<number> = [1, 2, 3]
const readonlyMapped = readonlyNumbers.map((n: number) => n)
const readonlySliced = readonlyNumbers.slice(0)
