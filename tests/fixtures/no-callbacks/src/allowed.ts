import type { Handler } from "./shared.js"

function returnsValue(callback: Handler): number {
  callback()
  return 1
}

function acceptsValue(value: string): void {
  void value
}

type FunctionTypeReturnsValue = (callback: Handler) => number

interface NonCallableValue {
  value: string
}

function acceptsNonCallableObject(input: NonCallableValue): void {
  void input
}
