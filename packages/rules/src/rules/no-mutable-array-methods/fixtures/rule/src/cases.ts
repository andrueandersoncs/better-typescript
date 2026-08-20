export {}

// number[]
const numbers: number[] = [1, 2, 3]
numbers.push(4) // ~detect 1

// Array<T>
const queue: Array<string> = ["a"]
queue.shift() // ~detect 1

// mutable tuple
const pair: [number, number] = [1, 2]
pair.reverse() // ~detect 1

// generic constraint <T extends number[]>
function sortsInPlace<T extends number[]>(values: T): void {
  values.sort() // ~detect 3
}

// union of arrays
declare const mixed: number[] | string[]
mixed.pop() // ~detect 1

// intersection with array
declare const tagged: number[] & { tag: string }
tagged.unshift(0) // ~detect 1
