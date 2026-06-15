export {}

// number[]
const numbers: number[] = [1, 2, 3]
numbers.push(4)

// Array<T>
const queue: Array<string> = ["a"]
queue.shift()

// mutable tuple
const pair: [number, number] = [1, 2]
pair.reverse()

// generic constraint <T extends number[]>
function sortsInPlace<T extends number[]>(values: T): void {
  values.sort()
}

// union of arrays
declare const mixed: number[] | string[]
mixed.pop()

// intersection with array
declare const tagged: number[] & { tag: string }
tagged.unshift(0)
