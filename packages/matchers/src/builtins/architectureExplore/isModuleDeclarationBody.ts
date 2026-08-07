import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"

export const isModuleDeclarationBody = (body: ts.ModuleBody): body is ts.NamespaceDeclaration =>
  strictEqual(ts.SyntaxKind.ModuleDeclaration)(body.kind)
