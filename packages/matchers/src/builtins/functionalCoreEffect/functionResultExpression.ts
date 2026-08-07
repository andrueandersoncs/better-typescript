import { Option } from "effect"
import type * as ts from "typescript"
import { isExpressionBody } from "../../support/isExpressionBody.js"
import { singleStatementReturnExpression } from "../../support/singleStatementReturnExpression.js"

const resultExpressionFromBody = (bodyNode: ts.ConciseBody) =>
  isExpressionBody(bodyNode) ? Option.some(bodyNode) : singleStatementReturnExpression(bodyNode)

export const functionResultExpression = (node: ts.FunctionLikeDeclaration) => {
  const body = Option.fromNullishOr(node.body)

  return Option.flatMap(body, resultExpressionFromBody)
}
