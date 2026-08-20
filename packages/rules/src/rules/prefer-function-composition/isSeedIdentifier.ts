import { Option, pipe } from "effect"
import type * as ts from "typescript"
import { carrierIdentifier } from "./carrierIdentifier.js"
import { identifierText } from "../../internal/support/identifierText.js"
import { strictEqual } from "../../internal/equivalence.js"

export const isSeedIdentifier = (name: string) => (expression: ts.Expression) => {
  const isSeedText = strictEqual(name)

  return pipe(carrierIdentifier(expression), Option.map(identifierText), Option.exists(isSeedText))
}
