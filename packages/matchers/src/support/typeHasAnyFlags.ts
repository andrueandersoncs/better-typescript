import * as ts from "typescript"

export const typeHasAnyFlags = (flags: ts.TypeFlags) => (type: ts.Type) =>
  (type.flags & flags) !== 0
