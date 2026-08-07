import { Option, pipe } from "effect"
import type * as ts from "typescript"
import { carrierIdentifier } from "./carrierIdentifier.js"
import { identifierText } from "./identifierText.js"
import { strictEqual } from "../equivalence.js"

export const isSeedIdentifier = (name: string) => (expression: ts.Expression) => {
  const isSeedText = strictEqual(name)

  return pipe(carrierIdentifier(expression), Option.map(identifierText), Option.exists(isSeedText))
}
