import * as ts from "typescript"

export const isVoidType = (type: ts.Type) => (type.flags & ts.TypeFlags.Void) !== 0
