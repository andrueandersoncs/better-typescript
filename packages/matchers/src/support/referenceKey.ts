import { recordSeparator } from "./recordSeparator.js"
import type * as ts from "typescript"
import { fieldSeparator } from "./fieldSeparator.js"
import type { ReferenceKey } from "./referenceKeyType.js"
import { symbolDeclarations } from "./symbolDeclarations.js"
import { Array, Function, Option, Order, pipe } from "effect"

export const declarationKey = (declaration: ts.Declaration) => {
  const sourceFile = declaration.getSourceFile()

  return `${sourceFile.fileName.replaceAll("\\", "/")}${fieldSeparator}${declaration.pos}${fieldSeparator}${declaration.end}${fieldSeparator}${declaration.kind}`
}

export const declarationKeys = Function.flow(
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
