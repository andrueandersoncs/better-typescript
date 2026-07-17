export {}

export const double = (value: number) => value * 2

class User {
  constructor(readonly id: number) {}
}

export const createUser = (id: number) => new User(id)

type Node = {
  readonly value: number
  readonly next: Node | null
}

export const mapNode = (node: Node, f: (value: number) => number): Node => ({
  value: f(node.value),
  next: node.next === null ? null : mapNode(node.next, f)
})

export const isNumber = (value: unknown): value is number => typeof value === "number"
