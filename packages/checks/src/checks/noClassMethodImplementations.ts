import { Array, pipe, Option } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { namedDetectionTarget } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

const methodDeclarationKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.MethodDeclaration
]

const isMethodDeclaration = ts.isMethodDeclaration

const isOverrideModifier = (modifier: ts.ModifierLike): boolean =>
  modifier.kind === ts.SyntaxKind.OverrideKeyword

const findOverrideModifier = (
  modifiers: ReadonlyArray<ts.ModifierLike>
): Option.Option<ts.ModifierLike> =>
  Array.findFirst(modifiers, isOverrideModifier)

// Check the parent class because MethodDeclaration also represents object-literal shorthand that is not OOP coupling.
const isReportableMethod = (node: ts.MethodDeclaration): boolean => {
  const isClassMember = ts.isClassLike(node.parent)
  const bodyOption = Option.fromNullable(node.body)
  const bodyExists = Option.isSome(bodyOption)
  const modifiers = ts.getModifiers(node)

  const isOverride = pipe(
    Option.fromNullable(modifiers),
    Option.flatMap(findOverrideModifier),
    Option.isSome
  )

  return Array.every([isClassMember, bodyExists, !isOverride], Boolean)
}

const methodImplementationMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (node: ts.MethodDeclaration): ReadonlyArray<Detection> =>
    pipe(
      Option.liftPredicate(isReportableMethod)(node),
      Option.map((node) => {
        const reportTarget = namedDetectionTarget(node)

        return match({
          node: reportTarget,
          message: "Avoid implementing methods on a class.",
          hint:
            "A class method that carries a body couples behavior to an object, which is " +
            "object-oriented programming and is not allowed. Extract the logic into a reusable " +
            "exported function that takes the data as a parameter. The only permitted method " +
            "implementation is one that overrides a base-class method (marked with `override`) for the purposes of integrating with a third-party library."
        })
      }),
      Option.toArray
    )

  return matches
}

const check = nodeCheck(methodDeclarationKinds)(isMethodDeclaration)(
  methodImplementationMatches
)

export const noClassMethodImplementations: Check = check

export const noClassMethodImplementationsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-class-method-implementations")
