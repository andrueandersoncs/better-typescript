import * as ts from "typescript"
import { pipe } from "effect"

export const declarationListIsConst = (list: ts.VariableDeclarationList) =>
  pipe(list.flags & ts.NodeFlags.Const, Boolean)
