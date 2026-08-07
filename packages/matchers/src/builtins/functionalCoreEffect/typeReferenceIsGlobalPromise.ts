import { Array, Option, Struct, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { MatchContext } from "../../matcher/matchContext.js"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"

export const typeReferenceIsGlobalPromise = (context: MatchContext, node: ts.TypeReferenceNode) => {
  const someOf2 = (declarations: ReadonlyArray<ts.Declaration>) =>
    Array.some(
      declarations,
      flow(
        (declaration: ts.Declaration) => declaration.getSourceFile(),
        (sourceFile: ts.SourceFile) => context.program.isSourceFileDefaultLibrary(sourceFile)
      )
    )

  const typeNameIsPromise = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Promise"))

  return pipe(
    Option.liftPredicate(ts.isIdentifier)(node.typeName),
    Option.filter(typeNameIsPromise),
    Option.flatMap(
      flow((typeName) => context.checker.getSymbolAtLocation(typeName), Option.fromNullishOr)
    ),
    Option.map(declarationsOfSymbol),
    Option.exists(someOf2)
  )
}
