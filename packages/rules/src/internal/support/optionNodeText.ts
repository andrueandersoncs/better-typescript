import * as ts from "typescript"
import { Option } from "effect"

export const optionNodeText = (node: ts.Identifier | ts.StringLiteralLike | ts.NumericLiteral) =>
  Option.some(node.text)
