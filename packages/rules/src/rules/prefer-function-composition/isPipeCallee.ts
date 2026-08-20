import { Function, Option, pipe } from "effect"
import type * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { carrierIdentifier } from "./carrierIdentifier.js"
import { identifierText } from "../../internal/support/identifierText.js"

export const isPipeCallee = (expression: ts.Expression) =>
  pipe(
    carrierIdentifier(expression),
    Option.map(identifierText),
    Option.exists(Function.flip(strictEqual)("pipe"))
  )
