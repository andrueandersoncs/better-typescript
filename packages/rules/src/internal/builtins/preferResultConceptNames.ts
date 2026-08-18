import { Array, Function, Option, Schema, Struct, pipe } from "effect"
import { functionDefinitionScanner } from "./functionDefinitionScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { callableExpectedResultWords } from "../support/callableExpectedResultWords.js"
import { callableSemantics } from "../support/callableSemantics.js"
import type { CallableSemantics } from "../support/callableSemanticsClass.js"
import { wordsMatch } from "../support/hasEsPluralSuffix.js"
import { isNonBooleanResult } from "../support/isNonBooleanResult.js"
import type { FunctionDefinition } from "../support/functionDefinition.js"

// PreferResultConceptNamesFact exists because its fields form one stable data contract used by the linter.
export const PreferResultConceptNamesFact = Schema.Struct({
  nameText: Schema.String,
  claimed: Schema.String,
  expected: Schema.String
})

export interface PreferResultConceptNamesFact extends Schema.Schema.Type<
  typeof PreferResultConceptNamesFact
> {}

const hasProjection = Function.flow(
  Struct.get<CallableSemantics, "projection">("projection"),
  Option.isSome
)

const matches = (context: MatchContext) => {
  const semanticsFor = callableSemantics(context)

  const matchFromSemantics = (semantics: CallableSemantics) =>
    Option.gen(function* () {
      const claimed = yield* semantics.name.result
      const expectedWords = callableExpectedResultWords(semantics)
      const expected = yield* Array.head(expectedWords)
      const agrees = Array.some(expectedWords, wordsMatch(claimed))
      yield* Option.liftPredicate((value: boolean) => !value)(agrees)

      const fact = PreferResultConceptNamesFact.make({
        nameText: semantics.name.text,
        claimed,
        expected
      })

      return makeNodeMatch(semantics.node, fact)
    })

  const matchFunctionDefinition = (scan: FunctionDefinition) =>
    pipe(
      semanticsFor(scan),
      Option.filter(hasProjection),
      Option.filter(isNonBooleanResult),
      Option.flatMap(matchFromSemantics),
      Option.toArray
    )

  return matchFunctionDefinition
}

export const preferResultConceptNamesScanner = functionDefinitionScanner(matches)
