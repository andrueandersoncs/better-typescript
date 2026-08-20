import { Option, pipe } from "effect"

import * as ts from "typescript"

import { optionalStringLiteralLikeText } from "../../internal/support/optionalStringLiteralLikeText.js"

export const stringLiteralArgument =
  (index: number) =>
  (node: ts.CallExpression): Option.Option<string> =>
    pipe(node.arguments[index], Option.fromNullishOr, optionalStringLiteralLikeText)
