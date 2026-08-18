import * as ts from "typescript"
import { Option } from "effect"

export const classDeclarationName = (declaration: ts.ClassDeclaration) =>
  Option.fromNullishOr(declaration.name)
