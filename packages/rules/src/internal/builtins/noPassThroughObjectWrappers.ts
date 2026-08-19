import { Array, Function, Option, Schema, flow, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import type { CallLikeExpression } from "../support/callLikeExpression.js"
import { unwrapExpression } from "../support/unwrapExpression.js"
import { invocationExpressionBody } from "./invocationExpressionBody.js"
import { isExactForwarder } from "./isExactForwarder.js"

// NoPassThroughObjectWrappersFact is empty because the forwarding shape is the finding.
export const NoPassThroughObjectWrappersFact = Schema.Struct({})

export interface NoPassThroughObjectWrappersFact extends Schema.Schema.Type<
  typeof NoPassThroughObjectWrappersFact
> {}

const emptyNoPassThroughObjectWrappersFact = NoPassThroughObjectWrappersFact.make({})

const forwardingFunctionKinds = Array.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.FunctionDeclaration
)

const isForwardingFunction = (
  node: ts.Node
): node is ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration => {
  const isExpressionFunction = ts.isArrowFunction(node) || ts.isFunctionExpression(node)

  return isExpressionFunction || ts.isFunctionDeclaration(node)
}

const isForwardedObjectLiteralArgument = flow(
  unwrapExpression,
  Option.liftPredicate(ts.isObjectLiteralExpression),
  Option.filter((literal) => literal.properties.length > 0),
  Option.isSome
)

const hasObjectArgument = (invocation: CallLikeExpression) => {
  const argumentsList = invocation.arguments ?? Array.empty<ts.Expression>()

  return Array.some(argumentsList, isForwardedObjectLiteralArgument)
}

const isPassThroughObjectWrapper = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
) => {
  const exactForwarder = isExactForwarder(node)
  const keepExactForwarder = Function.constant(exactForwarder)

  return pipe(
    invocationExpressionBody(node),
    Option.filter(hasObjectArgument),
    Option.exists(keepExactForwarder)
  )
}

const makePassThroughObjectWrapperMatch = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
) => makeNodeMatch(node, emptyNoPassThroughObjectWrappersFact)

const passThroughObjectWrapperMatches = (_context: MatchContext) =>
  flow(
    Option.liftPredicate(isPassThroughObjectWrapper),
    Option.map(makePassThroughObjectWrapperMatch),
    Option.toArray
  )

export const noPassThroughObjectWrappersScanner = makeNodeScanner(forwardingFunctionKinds)(
  isForwardingFunction
)(passThroughObjectWrapperMatches)
