import * as ts from "typescript"
import { stringLiteralLikeText } from "./stringLiteralLikeText.js"
import { Option, pipe } from "effect"

export const optionalStringLiteralLikeText = (node: Option.Option<ts.Node>) =>
  pipe(node, Option.flatMap(stringLiteralLikeText))
