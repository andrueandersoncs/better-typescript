import { Array, Function, Option, Order, pipe } from "effect"
import type * as ts from "typescript"
import { symbolDeclarations } from "./tsNode.js"

const fieldSeparator = "\u0000"
const recordSeparator = "\u0001"

// ReferenceKey uses compiler declarations because raw TypeScript objects have no stable equality.
export type ReferenceKey<_Symbol extends ts.Symbol = ts.Symbol> = string

const declarationKey = (declaration: ts.Declaration) => {
  const sourceFile = declaration.getSourceFile()

  return `${sourceFile.fileName.replaceAll("\\", "/")}${fieldSeparator}${declaration.pos}${fieldSeparator}${declaration.end}${fieldSeparator}${declaration.kind}`
}

const declarationKeys = Function.flow(
  symbolDeclarations,
  Option.fromNullishOr,
  Option.getOrElse(Array.empty),
  Array.map(declarationKey),
  Array.sort(Order.String)
)

export const referenceKey = (symbol: ts.Symbol): ReferenceKey =>
  pipe(
    declarationKeys(symbol),
    Array.prepend(`${symbol.name}${fieldSeparator}${symbol.flags}`),
    Array.join(recordSeparator)
  )

const declarationSourceFileName = (declaration: string) =>
  pipe(declaration.split(fieldSeparator), Array.head)

export const referenceKeySourceFileName = (key: ReferenceKey) =>
  pipe(key.split(recordSeparator), Array.get(1), Option.flatMap(declarationSourceFileName))
