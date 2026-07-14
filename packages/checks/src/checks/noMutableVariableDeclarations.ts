import { Tuple, Array, HashMap, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
/**
 * MutableVariableDeclarationKind is the shared length contract used by nested6,
 * nested7, and tokenMutableKind.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
type MutableVariableDeclarationKind = "let" | "var"

const nested6 = Tuple.make(
  ts.SyntaxKind.LetKeyword,
  "let" as MutableVariableDeclarationKind
)

const nested7 = Tuple.make(
  ts.SyntaxKind.VarKeyword,
  "var" as MutableVariableDeclarationKind
)

const mutableKeywordKinds: HashMap.HashMap<
  ts.SyntaxKind,
  MutableVariableDeclarationKind
> = HashMap.make(nested6, nested7)

const tokenMutableKind = (
  firstToken: ts.Node
): Option.Option<MutableVariableDeclarationKind> =>
  HashMap.get(mutableKeywordKinds, firstToken.kind)

const mutableDeclarationMatches = (context: CheckContext) => {
  const sourceFile = context.sourceFile
  const match = detection(context)

  const matches = (
    declarationList: ts.VariableDeclarationList
  ): ReadonlyArray<Detection> =>
    pipe(
      declarationList.getFirstToken(sourceFile),
      Option.fromNullable,
      Option.flatMap(tokenMutableKind),
      Option.map((kind) =>
        match({
          node: declarationList,
          message: `Avoid declaring mutable variables with ${kind}.`,
          hint:
            "Declare multiple const values to represent each state instead of mutating a single " +
            "variable, and use immutable values that are not reassigned. When the value must " +
            "genuinely evolve over time (a module-level counter, a cell shared across " +
            "closures), hold it in a Ref inside the Effect runtime instead of a let binding."
        })
      ),
      Option.toArray
    )

  return matches
}

const variableDeclarationListKinds = Array.of(
  ts.SyntaxKind.VariableDeclarationList
)

const check = nodeCheck(variableDeclarationListKinds)(
  ts.isVariableDeclarationList
)(mutableDeclarationMatches)

export const noMutableVariableDeclarations: Check = check

export const noMutableVariableDeclarationsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-mutable-variable-declarations")
