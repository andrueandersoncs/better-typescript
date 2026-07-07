import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const abstractKeywordKind = ts.SyntaxKind.AbstractKeyword

const isAbstractClassModifier = (node: ts.Node): node is ts.Node =>
  ts.isClassDeclaration(node.parent)

const abstractClassElements = (context: RuleContext) => {
  const element = detection(context)

  const matches = (node: ts.Node): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid declaring classes as abstract.",
      hint:
        "Declaring an abstract class in first-party code implies object-oriented programming, which is not allowed. To share " +
        "functionality, extract it into reusable functions and export those functions." +
        " To model a union of types, use a type union instead of an abstract class."
    })
  ]

  return matches
}

export const noAbstractClasses: RuleCheck = nodeCheck([abstractKeywordKind])(
  isAbstractClassModifier
)(abstractClassElements)
