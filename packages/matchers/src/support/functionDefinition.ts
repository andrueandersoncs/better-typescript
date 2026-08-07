import * as ts from "typescript"

// FunctionDefinition names executable forms because call edges need one owner.
export type FunctionDefinition =
  ts.ArrowFunction | ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration
