import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { isExtendsClause, namedDetectionTarget } from "./tsNode.js"
import { detection } from "../detectors/location.js"
import type { MakeDetection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

type ClassNode = ts.ClassDeclaration | ts.ClassExpression

const classNodeKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.ClassExpression
]

const isClassNode = (node: ts.Node): node is ClassNode =>
  ts.isClassDeclaration(node) || ts.isClassExpression(node)

const lacksExtendsClause = (declaration: ClassNode): boolean =>
  !(declaration.heritageClauses ?? []).some(isExtendsClause)

const rootLevelClassMatch =
  (match: MakeDetection) =>
  (declaration: ClassNode): Detection => {
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
  }

// The context stage runs once per file, so ruleMatch is shared by every class node the report wiring feeds to matches.
const rootLevelClassMatches = (context: RuleContext) => {
  const ruleMatch = rootLevelClassMatch(detection(context))

  const matches = (declaration: ClassNode): ReadonlyArray<Detection> =>
    pipe(
      Option.liftPredicate(lacksExtendsClause)(declaration),
      Option.map(ruleMatch),
      Option.toArray
    )

  return matches
}

const check = nodeCheck(classNodeKinds)(isClassNode)(rootLevelClassMatches)

export const noRootLevelClasses: RuleCheck = check
