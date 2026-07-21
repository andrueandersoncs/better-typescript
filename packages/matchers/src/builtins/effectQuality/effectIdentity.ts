import { Array } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "../../support/tsNode.js"

const responseJsonNames = Array.of("json")

export const callIsResponseJson = (call: ts.CallExpression) => {
  const callee = unwrapTransparentExpression(call.expression)

  return (
    ts.isPropertyAccessExpression(callee) && Array.contains(responseJsonNames, callee.name.text)
  )
}
