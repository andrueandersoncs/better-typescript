import { Struct, flow } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../equivalence.js"

export const identifierTextIsPipe = flow(
  Struct.get<ts.Identifier, "text">("text"),
  strictEqual("pipe")
)
