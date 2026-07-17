export {}

declare function emptyOf<T>(): Array<T>

export const numbers: Array<number> = emptyOf()

export const options: { readonly retry: boolean } = { retry: true }

export const state: "open" | "closed" = "open"

type Node = {
  readonly value: number
  readonly next: Node | null
}

export const mapNode = (node: Node, transform: (value: number) => number): Node => ({
  value: transform(node.value),
  next: node.next === null ? null : mapNode(node.next, transform)
})

export const isNumber = (value: unknown): value is number => typeof value === "number"

declare function zipWith<A, B, C>(
  left: ReadonlyArray<A>,
  right: ReadonlyArray<B>,
  combine: (left: A, right: B) => C
): ReadonlyArray<C>

export const pairs = zipWith([], [], (left: string, right: number) => `${left}:${right}`)

export const read = (value: unknown) => (typeof value === "string" ? value : String(value))
