import { flow, Struct } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

export const heritageClauseIsExtends = flow(
  Struct.get<ts.HeritageClause, "token">("token"),
  strictEqual(ts.SyntaxKind.ExtendsKeyword)
)
