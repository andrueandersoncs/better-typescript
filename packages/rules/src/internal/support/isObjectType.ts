import * as ts from "typescript"

export const isObjectType = (candidate: ts.Type): candidate is ts.ObjectType =>
  (candidate.flags & ts.TypeFlags.Object) !== 0
