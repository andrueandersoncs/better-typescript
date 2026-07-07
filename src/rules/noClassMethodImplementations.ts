import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { namedDetectionTarget } from "./tsNode.js"
import { detection } from "../detectors/location.js"
import type { MakeDetection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

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

// MethodDeclaration also covers object-literal method shorthand; only class members are OOP coupling.
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

// The context stage runs once per file, so the hoisted match partial is shared by all MethodDeclarations the report wiring feeds to matches.
const methodImplementationMatches = (context: RuleContext) => {
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

export const noClassMethodImplementations: RuleCheck = check
