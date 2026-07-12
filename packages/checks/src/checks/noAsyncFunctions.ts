import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
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

const asyncFunctionElements = (context: CheckContext) => {
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

export const noAsyncFunctions: Check = nodeCheck([asyncKeywordKind])(
  isAsyncFunctionModifier
)(asyncFunctionElements)

export const noAsyncFunctionsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-async-functions")
