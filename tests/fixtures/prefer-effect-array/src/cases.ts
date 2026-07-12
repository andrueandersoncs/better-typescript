export {}

// number[]
const numbers: number[] = [1, 2, 3]
const allPositive = numbers.every((n: number) => n > 0)

// Array<T>
const words: Array<string> = ["a", "b"]
const hasA = words.some((word: string) => word === "a")

// ReadonlyArray
const readonlyNumbers: ReadonlyArray<number> = [1, 2, 3]
const doubled = readonlyNumbers.map((n: number) => n * 2)

// tuple
const pair: [number, number] = [1, 2]
const joined = pair.join(",")

// array literal boolean fold
const flags = [true, false, true]
const allTrue = flags.every(Boolean)

// union of arrays
declare const mixed: number[] | string[]
const first = mixed.find((value) => value !== undefined)

void allPositive
void hasA
void doubled
void joined
void allTrue
void first
