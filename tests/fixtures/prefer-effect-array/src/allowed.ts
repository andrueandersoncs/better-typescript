export {}

import { Array } from "effect"

// Effect Array module calls
const numbers: number[] = [1, 2, 3]
const allPositive = Array.every(numbers, (n: number) => n > 0)
const doubled = Array.map(numbers, (n: number) => n * 2)
const hasPositive = Array.some(numbers, (n: number) => n > 0)

// same-named methods on non-array receivers
const label = "hello"
const hasEll = label.includes("ell")
const chopped = label.slice(1)

const fake = {
  every: (value: boolean): boolean => value,
  map: (value: number): number => value
}
const fakeEvery = fake.every(true)
const fakeMapped = fake.map(1)

class Collector {
  map(): void {}
}
new Collector().map()

const ids = new Set<number>([1, 2])
ids.has(1)

void allPositive
void doubled
void hasPositive
void hasEll
void chopped
void fakeEvery
void fakeMapped
