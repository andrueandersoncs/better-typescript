import { Array, Struct, flow } from "effect"
import * as ts from "typescript"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

export const emptyHeritageClauses: ReadonlyArray<ts.HeritageClause> = Array.empty()

export const heritageClauseIsExtends = flow(
  Struct.get<ts.HeritageClause, "token">("token"),
  strictEqual(ts.SyntaxKind.ExtendsKeyword)
)
