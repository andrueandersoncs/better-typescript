import { Struct, flow } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../equivalence.js"

export const heritageClauseIsExtends = flow(
  Struct.get<ts.HeritageClause, "token">("token"),
  strictEqual(ts.SyntaxKind.ExtendsKeyword)
)
