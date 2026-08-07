import { flow, Struct } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

export const anyKeywordType = flow(
  Struct.get<ts.TypeNode, "kind">("kind"),
  strictEqual(ts.SyntaxKind.AnyKeyword)
)
