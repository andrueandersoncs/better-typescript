import type * as ts from "typescript"

// EntityDeclaration is closed because semantic modules exclude other syntax.
export type EntityDeclaration =
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
  | ts.VariableDeclaration
  | ts.ModuleDeclaration
