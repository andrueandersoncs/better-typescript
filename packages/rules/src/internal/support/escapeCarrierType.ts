import type * as ts from "typescript"

// EscapeCarrier is var/param syntax because boundary checks share one vocabulary.
export type EscapeCarrier = ts.VariableDeclaration | ts.ParameterDeclaration
