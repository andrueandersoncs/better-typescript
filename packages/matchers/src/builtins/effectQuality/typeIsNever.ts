import * as ts from "typescript"

export const typeIsNever = (type: ts.Type) => (type.flags & ts.TypeFlags.Never) !== 0
