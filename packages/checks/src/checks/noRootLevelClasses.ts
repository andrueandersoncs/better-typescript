import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { isExtendsClause, namedDetectionTarget } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
type ClassNode = ts.ClassDeclaration | ts.ClassExpression

const classNodeKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.ClassExpression
]

const isClassNode = (node: ts.Node): node is ClassNode =>
  ts.isClassDeclaration(node) || ts.isClassExpression(node)

const lacksExtendsClause = (declaration: ClassNode): boolean =>
  !Array.some((declaration.heritageClauses ?? []), isExtendsClause)

const rootLevelClassMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (declaration: ClassNode): ReadonlyArray<Detection> =>
    pipe(
      Option.liftPredicate(lacksExtendsClause)(declaration),
      Option.map((declaration) => {
        const node = namedDetectionTarget(declaration)

        return match({
          node,
          message: "Avoid classes that do not extend another class.",
          hint:
            "Classes should never implement data structures, algorithms, or modules — model those " +
            "with a functional approach (plain functions over Effect data types). The only sanctioned " +
            "use of a class is integrating with a third-party library that requires subclassing, so " +
            "every class must extend some other class as proof of that integration — for example " +
            "extending Effect's Schema.Class, Schema.TaggedError, Data.TaggedClass, or a base class " +
            "from the library you are integrating with."
        })
      }),
      Option.toArray
    )

  return matches
}

const check = nodeCheck(classNodeKinds)(isClassNode)(rootLevelClassMatches)

export const noRootLevelClasses: Check = check

export const noRootLevelClassesExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-root-level-classes")
