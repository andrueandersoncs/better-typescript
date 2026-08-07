import type * as ts from "typescript"

// EffectfulFunctionDeclaration is a local syntax union because matchers narrow one node shape.
export type EffectfulFunctionDeclaration = ts.VariableDeclaration | ts.FunctionDeclaration
