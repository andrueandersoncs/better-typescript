import { Tuple, Array, HashMap, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
// MutableVariableDeclarationKind is shared binding vocabulary because owners exchange one contract.
export type MutableVariableDeclarationKind = "let" | "var"

const nested6 = Tuple.make(ts.SyntaxKind.LetKeyword, "let" as MutableVariableDeclarationKind)

const nested7 = Tuple.make(ts.SyntaxKind.VarKeyword, "var" as MutableVariableDeclarationKind)

const mutableKeywordKinds = HashMap.make(nested6, nested7)

const tokenMutableKind = (firstToken: ts.Node) => HashMap.get(mutableKeywordKinds, firstToken.kind)

const mutableDeclarationMatches = (context: CheckContext) => {
  const sourceFile = context.sourceFile
  const match = makeDetection(context)

  const matches = (declarationList: ts.VariableDeclarationList): ReadonlyArray<Detection> => {
    const mutableKindDetection = (kind: MutableVariableDeclarationKind) =>
      match({
        node: declarationList,
        message: `Avoid declaring mutable variables with ${kind}.`,
        hint:
          "Declare multiple const values to represent each state instead of mutating a single " +
          "variable, and use immutable values that are not reassigned. When the value must " +
          "genuinely evolve over time (a module-level counter, a cell shared across " +
          "closures), hold it in a Ref inside the Effect runtime instead of a let binding."
      })

    return pipe(
      declarationList.getFirstToken(sourceFile),
      Option.fromNullishOr,
      Option.flatMap(tokenMutableKind),
      Option.map(mutableKindDetection),
      Option.toArray
    )
  }

  return matches
}

const variableDeclarationListKinds = Array.of(ts.SyntaxKind.VariableDeclarationList)

export const noMutableVariableDeclarations = makeCheck(
  "no-mutable-variable-declarations",
  variableDeclarationListKinds,
  ts.isVariableDeclarationList,
  mutableDeclarationMatches
)
