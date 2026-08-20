import { Option, Struct, flow } from "effect"
import type * as ts from "typescript"
import { optionalStringLiteralLikeText } from "../optionalStringLiteralLikeText.js"

export const moduleSpecifierText = flow(
  Struct.get<ts.ImportDeclaration | ts.ExportDeclaration, "moduleSpecifier">("moduleSpecifier"),
  Option.fromNullishOr,
  optionalStringLiteralLikeText
)
