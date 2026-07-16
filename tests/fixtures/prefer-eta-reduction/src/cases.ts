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

export const freeFunction = (factory: unknown): unknown => // ~detect 29
  defaultConfigExport(factory)

export const alreadyApplied = (signal: { readonly text: string }): string => // ~detect 31
  Struct.get("text")(signal)

export const curriedOuter = (type: ts.Type): boolean => // ~detect 29
  hasCallSignature(checker)(type)

export const typePredicateRebind = ( // ~detect 36
  node: ts.Node
): node is ts.MethodDeclaration => ts.isMethodDeclaration(node)

export const nestedUnary = (value: number): number => g(f(value)) // ~detect 28
