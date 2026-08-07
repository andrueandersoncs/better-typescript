import { Array, Function, Option, Schema, Struct, pipe } from "effect"
import { functionDefinitionMatcher } from "./functionDefinitionMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { callableExpectedResultWords } from "../support/callableExpectedResultWords.js"
import { callableSemantics } from "../support/callableSemantics.js"
import type { CallableSemantics } from "../support/callableSemanticsClass.js"
import { wordsMatch } from "../support/hasEsPluralSuffix.js"
import { isNonBooleanResult } from "../support/isNonBooleanResult.js"
import type { FunctionDefinition } from "../support/functionDefinition.js"

// PreferResultConceptNamesFact pairs claimed and expected words because naming advice needs both.
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

  const matchFunctionDefinition = (definition: FunctionDefinition) =>
    pipe(
      semanticsFor(definition),
      Option.filter(hasProjection),
      Option.filter(isNonBooleanResult),
      Option.flatMap(matchFromSemantics),
      Option.toArray
    )

  return matchFunctionDefinition
}

export const preferResultConceptNamesMatcher = functionDefinitionMatcher(matches)
