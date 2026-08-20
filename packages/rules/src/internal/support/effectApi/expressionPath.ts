import { Match, Option, Struct, Tuple, flow, pipe } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "../transparentWrapper.js"
import { emptyMemberPath } from "./emptyMemberPath.js"
import { makePathWithMember } from "./makePathWithMember.js"

const identifierEmptyPath = (identifier: ts.Identifier) => Tuple.make(identifier, emptyMemberPath)

export const expressionPath = (
  expression: ts.Expression
): Option.Option<readonly [ts.Identifier, ReadonlyArray<string>]> => {
  const propertyAccessPath = (access: ts.PropertyAccessExpression) =>
    pipe(expressionPath(access.expression), Option.map(makePathWithMember(access.name.text)))

  const elementAccessPath = (access: ts.ElementAccessExpression) => {
    const member = pipe(
      Option.fromNullishOr(access.argumentExpression),
      Option.filter(ts.isStringLiteralLike),
      Option.map(Struct.get("text"))
    )

    const base = expressionPath(access.expression)

    return pipe(
      Option.all({ base, member }),
      Option.map(({ base, member }) => makePathWithMember(member)(base))
    )
  }

  return pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(ts.isIdentifier, flow(identifierEmptyPath, Option.some)),
    Match.when(ts.isPropertyAccessExpression, propertyAccessPath),
    Match.when(ts.isElementAccessExpression, elementAccessPath),
    Match.orElse(() => Option.none())
  )
}
