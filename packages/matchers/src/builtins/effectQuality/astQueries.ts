import { Option, pipe } from "effect"
import * as ts from "typescript"
import { propertyNameText } from "../../support/tsNode.js"
import { optionalStringLiteralLikeText } from "../../support/stringLiteralText.js"

export const declarationNameText = (declaration: ts.NamedDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.name),
    Option.filter(ts.isPropertyName),
    Option.flatMap(propertyNameText)
  )

export const ancestorMatching =
  <A extends ts.Node>(guard: (candidate: ts.Node) => candidate is A) =>
  (node: ts.Node): Option.Option<A> => {
    const visit = (current: ts.Node): Option.Option<A> =>
      guard(current)
        ? Option.some(current)
        : pipe(Option.fromNullishOr(current.parent), Option.flatMap(visit))

    return pipe(Option.fromNullishOr(node.parent), Option.flatMap(visit))
  }

export const stringLiteralArgument =
  (index: number) =>
  (node: ts.CallExpression): Option.Option<string> =>
    pipe(node.arguments[index], Option.fromNullishOr, optionalStringLiteralLikeText)
