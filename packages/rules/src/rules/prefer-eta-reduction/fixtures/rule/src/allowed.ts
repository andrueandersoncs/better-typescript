import * as ts from "typescript"
import { Array } from "effect"

export {}

declare const fileName: string
declare const f: (value: number) => number
declare const Chunk: {
  readonly fromIterable: <A>(items: Iterable<A>) => ReadonlyArray<A>
}
declare const defaultConfigExport: (factory: unknown) => unknown
declare const checker: ts.TypeChecker

export const alreadyEtaReduced = defaultConfigExport

export const methodReceiver = (segment: string): boolean =>
  fileName.includes(segment)

export const singletonArray = (value: number): ReadonlyArray<number> => [
  f(value)
]

export const propertyRead = (user: { readonly name: string }): string =>
  user.name

export const bindThreadBlock = (symbol: string | null): string | null => {
  const value = symbol

  return value
}

export const bracedReturn = (value: number): number => {
  return f(value)
}

export const multiArg = (items: ReadonlyArray<number>): boolean =>
  Array.some(items, (item) => item > 0)

export const restParam = (...values: ReadonlyArray<number>): number =>
  f(values[0] ?? 0)

export const paramInCallee = (value: number): number =>
  ((current: number) => current + value)(value)

export const nonForwardAdapter = (
  values: Iterable<number>
): ReadonlyArray<number> => Chunk.fromIterable([...values])

export const instanceCheckerMethod = (node: ts.Node): ts.Type =>
  checker.getTypeAtLocation(node)
