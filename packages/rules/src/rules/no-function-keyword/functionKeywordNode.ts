import type * as ts from "typescript"

// FunctionKeywordNode is a local syntax union because scanners need one narrowed node shape.
export type FunctionKeywordNode = ts.FunctionDeclaration | ts.FunctionExpression
