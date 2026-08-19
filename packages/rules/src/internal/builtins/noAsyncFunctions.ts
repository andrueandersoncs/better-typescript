import { Array, Function, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"

// NoAsyncFunctionsFact exists because its fields form one stable data contract used by the linter.
export const NoAsyncFunctionsFact = Schema.Struct({})

export interface NoAsyncFunctionsFact extends Schema.Schema.Type<typeof NoAsyncFunctionsFact> {}

// emptyNoAsyncFunctionsFact exists because its fields form one stable data contract used by the linter.
export const emptyNoAsyncFunctionsFact = NoAsyncFunctionsFact.make({})

const isAsyncFunctionModifier = (node: ts.Node): node is ts.Node => {
  const isFunctionDeclaration = ts.isFunctionDeclaration(node.parent)
  const isFunctionExpression = ts.isFunctionExpression(node.parent)
  const isArrowFunction = ts.isArrowFunction(node.parent)
  const isMethodDeclaration = ts.isMethodDeclaration(node.parent)

  const conditions = Array.make(
    isFunctionDeclaration,
    isFunctionExpression,
    isArrowFunction,
    isMethodDeclaration
  )

  return Array.some(conditions, Boolean)
}

const asyncKeywordKinds = Array.of(ts.SyntaxKind.AsyncKeyword)

const matchAsyncFunctionNode = (node: ts.Node) =>
  pipe(makeNodeMatch(node, emptyNoAsyncFunctionsFact), Array.of)

const noAsyncFunctionsMatches = Function.constant(matchAsyncFunctionNode)

export const noAsyncFunctionsScanner =
  makeNodeScanner(asyncKeywordKinds)(isAsyncFunctionModifier)(noAsyncFunctionsMatches)
