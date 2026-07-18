import { Array, Option, pipe } from "effect"
import { makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import {
  callableSemantics,
  callableExpectedResultWords,
  functionDefinitionKinds,
  wordsMatch
} from "./support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "./support/tsNode.js"

const resultConceptNameMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const semanticsFor = callableSemantics(context)

  const matches = (definition: FunctionDefinition): ReadonlyArray<Detection> =>
    pipe(
      semanticsFor(definition),
      Option.filter((semantics) => Option.isSome(semantics.projection)),
      Option.filter((semantics) => semantics.result.shape !== "boolean"),
      Option.flatMap((semantics) =>
        Option.gen(function* () {
          const claimed = yield* semantics.name.result
          const expectedWords = callableExpectedResultWords(semantics)
          const expected = yield* Array.head(expectedWords)
          const agrees = Array.some(expectedWords, wordsMatch(claimed))
          yield* Option.liftPredicate((value: boolean) => !value)(agrees)

          return match({
            node: semantics.node,
            message: `${semantics.name.text} names its result as ${claimed}, but it returns ${expected}.`,
            hint:
              `Rename the result phrase to ${expected}. Preserve operation and source qualifiers, ` +
              `using ${expected}FromSource or sourceTo${expected} when direction matters.`
          })
        })
      ),
      Option.toArray
    )

  return matches
}

export const preferResultConceptNames = makeCheck(
  "prefer-result-concept-names",
  functionDefinitionKinds,
  isFunctionDefinition,
  resultConceptNameMatches
)
