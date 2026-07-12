import * as ts from "typescript"

export {}

declare const defaultConfigExport: (factory: unknown) => unknown
declare const Struct: {
  readonly get: (key: "text") => (value: { readonly text: string }) => string
}
declare const hasCallSignature: (
  checker: ts.TypeChecker
) => (type: ts.Type) => boolean
declare const checker: ts.TypeChecker
declare const f: (value: number) => number
declare const g: (value: number) => number

export const freeFunction = (factory: unknown): unknown =>
  defaultConfigExport(factory)

export const alreadyApplied = (signal: { readonly text: string }): string =>
  Struct.get("text")(signal)

export const curriedOuter = (type: ts.Type): boolean =>
  hasCallSignature(checker)(type)

export const typePredicateRebind = (
  node: ts.Node
): node is ts.MethodDeclaration => ts.isMethodDeclaration(node)

export const nestedUnary = (value: number): number => g(f(value))
