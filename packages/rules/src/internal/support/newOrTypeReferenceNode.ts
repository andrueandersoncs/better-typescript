import * as ts from "typescript"

// NewOrTypeReferenceNode is the new/type-ref contract because both checks need one vocabulary.
export type NewOrTypeReferenceNode = ts.NewExpression | ts.TypeReferenceNode
