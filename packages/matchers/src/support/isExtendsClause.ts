import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { flow, Struct } from "effect"

export const isExtendsClause = flow(
  Struct.get<ts.HeritageClause, "token">("token"),
  strictEqual(ts.SyntaxKind.ExtendsKeyword)
)
