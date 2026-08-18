import { strictEqual } from "../equivalence.js"
import type { FunctionDefinition } from "./functionDefinition.js"
import { isFunctionInitializer } from "./isFunctionInitializer.js"
import { singleResultExpression } from "./singleResultExpression.js"
import { unwrapCarrier } from "./unwrapCarrier.js"
import { pipe, Option, Array } from "effect"

export const semanticDefinitions =
  (remainingDepth: number) =>
  (scan: FunctionDefinition): ReadonlyArray<FunctionDefinition> => {
    const nestedDefinition = pipe(
      singleResultExpression(scan),
      Option.map(unwrapCarrier),
      Option.filter(isFunctionInitializer)
    )

    const atLimit = strictEqual(0)(remainingDepth)

    return pipe(
      nestedDefinition,
      Option.filter(() => !atLimit),
      Option.match({
        onNone: () => Array.of(scan),
        onSome: (nested) =>
          pipe(semanticDefinitions(remainingDepth - 1)(nested), Array.prepend(scan))
      })
    )
  }

export const callableDefinitions = semanticDefinitions(4)
