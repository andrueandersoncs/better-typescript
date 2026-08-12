import { Function, Option, pipe } from "effect"
import type * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { carrierIdentifier } from "./carrierIdentifier.js"
import { identifierText } from "./identifierText.js"

export const isPipeCallee = (expression: ts.Expression) =>
  pipe(
    carrierIdentifier(expression),
    Option.map(identifierText),
    Option.exists(Function.flip(strictEqual)("pipe"))
  )
