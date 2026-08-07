import { Array, Option, pipe } from "effect"

import * as ts from "typescript"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

export const responseBodyNames = Array.make(
  "json",
  "text",
  "arrayBuffer",
  "blob",
  "formData",
  "bytes"
)

const propertyAccessIsResponseBody = (access: ts.PropertyAccessExpression) =>
  Array.contains(responseBodyNames, access.name.text)

export const callIsResponseBodyRead = (call: ts.CallExpression) => {
  const callee = unwrapTransparentExpression(call.expression)
  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)

  return pipe(propertyAccess, Option.exists(propertyAccessIsResponseBody))
}
