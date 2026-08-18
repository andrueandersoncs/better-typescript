import * as ts from "typescript"

export const variableDeclarationNameIsIdentifier = (declaration: ts.VariableDeclaration) =>
  ts.isIdentifier(declaration.name)
