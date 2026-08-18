import * as ts from "typescript"
import { isFunctionInitializer } from "./isFunctionInitializer.js"
import { pipe, Option } from "effect"

export const functionInitializer = (declaration: ts.VariableDeclaration) =>
  pipe(Option.fromNullishOr(declaration.initializer), Option.filter(isFunctionInitializer))
