import * as ts from "typescript"

export const errorTypeName = (typeName: ts.EntityName) =>
  ts.isIdentifier(typeName) ? typeName : typeName.right
