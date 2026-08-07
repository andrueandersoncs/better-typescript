import * as ts from "typescript"
import { Option } from "effect"

export const variableDeclarationInitializer = (declaration: ts.VariableDeclaration) =>
  Option.fromNullishOr(declaration.initializer)
