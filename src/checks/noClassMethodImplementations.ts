import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { namedDetectionTarget } from "./support/tsNode.js"
import { detection } from "../engine/location.js"
import type { MakeDetection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"
import {
  fixtureRefactorExamples
} from "../engine/example.js"
import type { NonEmptyRefactorExamples } from "../engine/example.js"

const methodDeclarationKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.MethodDeclaration
]

const isMethodDeclaration = (node: ts.Node): node is ts.MethodDeclaration =>
  ts.isMethodDeclaration(node)

const isOverrideModifier = (modifier: ts.ModifierLike): boolean =>
  modifier.kind === ts.SyntaxKind.OverrideKeyword

const findOverrideModifier = (
  modifiers: ReadonlyArray<ts.ModifierLike>
): Option.Option<ts.ModifierLike> => {
  const modifier = modifiers.find(isOverrideModifier)

  return Option.fromNullable(modifier)
}

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

  return [isClassMember, bodyExists, !isOverride].every(Boolean)
}

const methodImplementationMatch =
  (match: MakeDetection) =>
  (node: ts.MethodDeclaration): Detection => {
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
  }

const methodImplementationMatches = (context: CheckContext) => {
  const ruleMatch = methodImplementationMatch(detection(context))

  const matches = (node: ts.MethodDeclaration): ReadonlyArray<Detection> => {
    const reportable = Option.liftPredicate(isReportableMethod)(node)

    return pipe(reportable, Option.map(ruleMatch), Option.toArray)
  }

  return matches
}

const check = nodeCheck(methodDeclarationKinds)(isMethodDeclaration)(
  methodImplementationMatches
)

export const noClassMethodImplementations: Check = check

export const noClassMethodImplementationsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-class-method-implementations")
