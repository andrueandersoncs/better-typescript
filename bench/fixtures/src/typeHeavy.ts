// Benchmark fixture: type-checker-heavy code.
// Stresses rules that resolve types through ts.TypeChecker (no-mutable-array-methods,
// prefer-effect-fn, no-callbacks): generics, unions, tuples, and method names that
// collide with Array.prototype mutators on non-array receivers.

import type { Effect } from "./Effect.js"
import { fromValue } from "./Effect.js"

type Primitive = string | number | boolean

interface TreeNode<T> {
  readonly value: T
  readonly children: Array<TreeNode<T>>
}

// Array mutators on generic array types — the rule must resolve the instantiated type.
export const insertChild = <T extends Primitive>(
  tree: TreeNode<T>,
  value: T
): TreeNode<T> => {
  const children = tree.children.slice()
  children.push({ value, children: [] })
  children.reverse()
  return { value: tree.value, children }
}

// Mutators on unions of array types.
export const drainQueue = (queue: Array<string> | Array<number>): number => {
  let drained = 0
  while (queue.length > 0) {
    queue.pop()
    drained += 1
  }
  return drained
}

// Mutators on tuples and on arrays reached through property access chains.
interface Buffers {
  readonly pending: Array<[id: string, priority: number]>
  readonly settled: Array<string>
}

export const settle = (buffers: Buffers, id: string): void => {
  buffers.pending.splice(0, 1)
  buffers.settled.push(id)
  buffers.settled.sort()
}

// Same method names on NON-array receivers: the rule pays the checker lookup and
// must conclude these are not arrays.
class Stack {
  private items: Array<number> = []

  push(item: number): number {
    this.items.unshift(item)
    return this.items.length
  }

  pop(): number {
    return this.items.shift() ?? 0
  }

  sort(): Stack {
    return this
  }
}

export const churnStack = (iterations: number): number => {
  const stack = new Stack()
  let index = 0
  while (index < iterations) {
    stack.push(index)
    stack.sort()
    stack.pop()
    index += 1
  }
  return stack.pop()
}

// Phantom Effect from ./Effect.ts: checker-resolved generic returns exercise
// prefer-effect-fn's symbol resolution on an instantiated generic type.
export const mapTree = <T extends Primitive, U extends Primitive>(
  tree: TreeNode<T>,
  transform: (value: T) => U
): Effect<TreeNode<U>, never, never> =>
  fromValue({
    value: transform(tree.value),
    children: tree.children.map((child) => deepMap(child, transform))
  })

const deepMap = <T extends Primitive, U extends Primitive>(
  tree: TreeNode<T>,
  transform: (value: T) => U
): TreeNode<U> => ({
  value: transform(tree.value),
  children: tree.children.map((child) => deepMap(child, transform))
})

// Deeply instantiated generics so signature resolution does real work.
type Result<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false }

export const traverseResults = <T extends Primitive>(
  results: Array<Result<Array<TreeNode<T>>>>
): Array<TreeNode<T>> => {
  const collected: Array<TreeNode<T>> = []
  for (const result of results) {
    if (result.ok) {
      collected.push(...result.value)
    }
  }
  return collected
}

// no-duplicate-function-names: `formatValue` is also declared in disallowed cases.ts.
export const formatValue = (value: number): string => `${value}`
