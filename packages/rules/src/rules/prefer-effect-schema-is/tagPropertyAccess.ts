import { Option, pipe } from "effect"
import * as ts from "typescript"
import { unwrapExpression } from "../../internal/support/unwrapExpression.js"
import { strictEqual } from "../../internal/equivalence.js"

const tagPropertyName = "_tag"

export const hasTagPropertyName = (expression: ts.PropertyAccessExpression) =>
  strictEqual(tagPropertyName)(expression.name.text)

export const tagPropertyAccess = (expression: ts.Expression) =>
  pipe(
    unwrapExpression(expression),
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.filter(hasTagPropertyName)
  )

export { tagPropertyName }
