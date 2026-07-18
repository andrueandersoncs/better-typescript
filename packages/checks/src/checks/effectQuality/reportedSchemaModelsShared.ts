import { Array } from "effect"
import * as ts from "typescript"

export const emptyHeritageClauses: ReadonlyArray<ts.HeritageClause> = Array.empty()

export const heritageClauseIsExtends = (clause: ts.HeritageClause) =>
  clause.token === ts.SyntaxKind.ExtendsKeyword
