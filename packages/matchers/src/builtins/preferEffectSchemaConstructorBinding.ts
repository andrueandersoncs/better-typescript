import * as ts from "typescript"

export interface NamedVariableDeclaration extends ts.VariableDeclaration {
  readonly name: ts.Identifier
}
