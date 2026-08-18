import type * as ts from "typescript"

// DataStructureDeclaration is the first-party model syntax union because ownership is shared.
export type DataStructureDeclaration =
  | ts.ClassDeclaration
  | ts.EnumDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.VariableDeclaration
