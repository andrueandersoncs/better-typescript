import { Array } from "effect"
import * as ts from "typescript"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

export const emptyHeritageClauses: ReadonlyArray<ts.HeritageClause> = Array.empty()

export const heritageClauseIsExtends = (clause: ts.HeritageClause) =>
  strictEqual(clause.token, ts.SyntaxKind.ExtendsKeyword)
