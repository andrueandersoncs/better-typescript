import * as ts from "typescript"
import { Option } from "effect"

export const functionDeclarationName = (declaration: ts.FunctionDeclaration) =>
  Option.fromNullishOr(declaration.name)
