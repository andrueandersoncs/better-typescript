import { Struct, flow } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

export const identifierTextIsPipe = flow(
  Struct.get<ts.Identifier, "text">("text"),
  strictEqual("pipe")
)
