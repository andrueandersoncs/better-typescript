import { Match, Option, pipe } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"

const isAbsentQuestionDotToken = (access: ts.PropertyAccessExpression) =>
  pipe(access.questionDotToken, Option.fromNullishOr, Option.isNone)

const isNonOptionalPropertyAccess = (
  expression: ts.Expression
): expression is ts.PropertyAccessExpression =>
  pipe(
    expression,
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.exists(isAbsentQuestionDotToken)
  )

const identifierText = (identifier: ts.Identifier) => Option.some(identifier.text)

const joinCalleeWithAccessName = (access: ts.PropertyAccessExpression) => (left: string) =>
  `${left}.${access.name.text}`

const propertyAccessCalleeName = (access: ts.PropertyAccessExpression) =>
  pipe(calleeName(access.expression), Option.map(joinCalleeWithAccessName(access)))

export const calleeName = (expression: ts.Expression): Option.Option<string> =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(ts.isIdentifier, identifierText),
    Match.when(isNonOptionalPropertyAccess, propertyAccessCalleeName),
    Match.orElse((): Option.Option<string> => Option.none())
  )
