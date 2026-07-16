import { Option } from "effect"
import type * as ts from "typescript"

declare const typeNode: Option.Option<ts.TypeNode>
declare const checker: ts.TypeChecker
declare const parameter: ts.ParameterDeclaration

export const resolved = Option.isSome(typeNode)
  ? checker.getTypeFromTypeNode(typeNode.value)
  : checker.getTypeAtLocation(parameter)
