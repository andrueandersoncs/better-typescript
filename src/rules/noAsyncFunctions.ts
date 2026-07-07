import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const asyncKeywordKind = ts.SyntaxKind.AsyncKeyword

const isAsyncFunctionModifier = (node: ts.Node): node is ts.Node => {
  const parent = node.parent

  return [
    ts.isFunctionDeclaration(parent),
    ts.isFunctionExpression(parent),
    ts.isArrowFunction(parent),
    ts.isMethodDeclaration(parent)
  ].some(Boolean)
}

const asyncFunctionElements = (context: RuleContext) => {
  const element = detection(context)

  const matches = (node: ts.Node): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid declaring functions as async.",
      hint:
        "Model asynchronous work with Effect instead of async/await. To integrate with a " +
        "third-party library: wrap incoming promises with Effect.tryPromise; satisfy an " +
        "outgoing Promise-returning callback contract with a non-async function that " +
        "returns Effect.runPromise(effect)."
    })
  ]

  return matches
}

export const noAsyncFunctions: RuleCheck = nodeCheck([asyncKeywordKind])(
  isAsyncFunctionModifier
)(asyncFunctionElements)
