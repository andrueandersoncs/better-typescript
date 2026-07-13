import { pipe, Array } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const asyncKeywordKind = ts.SyntaxKind.AsyncKeyword

const isAsyncFunctionModifier = (node: ts.Node): node is ts.Node => {
  const parent = node.parent

  const isFunctionDeclaration = ts.isFunctionDeclaration(parent)
  const isFunctionExpression = ts.isFunctionExpression(parent)
  const isArrowFunction = ts.isArrowFunction(parent)
  const isMethodDeclaration = ts.isMethodDeclaration(parent)

  const conditions = Array.make(
    isFunctionDeclaration,
    isFunctionExpression,
    isArrowFunction,
    isMethodDeclaration
  )

  return Array.some(conditions, Boolean)
}

const asyncFunctionElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.Node): ReadonlyArray<Detection> =>
    pipe(
      {
        node,
        message: "Avoid declaring functions as async.",
        hint:
          "Model asynchronous work with Effect instead of async/await. To integrate with a " +
          "third-party library: wrap incoming promises with Effect.tryPromise; satisfy an " +
          "outgoing Promise-returning callback contract with a non-async function that " +
          "returns Effect.runPromise(effect)."
      },
      element,
      Array.of
    )

  return matches
}

const asyncKeywordKinds = Array.of(asyncKeywordKind)

export const noAsyncFunctions: Check = nodeCheck(asyncKeywordKinds)(
  isAsyncFunctionModifier
)(asyncFunctionElements)

export const noAsyncFunctionsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-async-functions")
