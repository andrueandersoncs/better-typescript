import type * as ts from "typescript"

// CallbackStyleDeclaration is a local syntax union because scanners need one narrowed node shape.
export type CallbackStyleDeclaration =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.MethodSignature
  | ts.CallSignatureDeclaration
  | ts.FunctionTypeNode
