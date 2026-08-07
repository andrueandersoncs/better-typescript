import { Array, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

const globalFetchReceivers = Array.make("globalThis", "window", "self")

const expressionIsFetchCallee = (expression: ts.Expression) => {
  const current = unwrapTransparentExpression(expression)

  if (ts.isIdentifier(current)) {
    return strictEqual("fetch")(current.text)
  }

  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(current)

  const accessIsNamedFetch = (access: ts.PropertyAccessExpression) =>
    strictEqual("fetch")(access.name.text)

  const unwrapAccessExpression = (access: ts.PropertyAccessExpression) =>
    unwrapTransparentExpression(access.expression)

  const receiverIsGlobalFetch = (receiver: ts.Identifier) =>
    Array.contains(globalFetchReceivers, receiver.text)

  return pipe(
    propertyAccess,
    Option.filter(accessIsNamedFetch),
    Option.map(unwrapAccessExpression),
    Option.filter(ts.isIdentifier),
    Option.exists(receiverIsGlobalFetch)
  )
}

export const callIsFetch = (call: ts.CallExpression) => expressionIsFetchCallee(call.expression)
