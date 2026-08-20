import { Array, Function, HashSet, Match, Option, Schema, Tuple, pipe } from "effect"
import { functionDefinitionScanner } from "../../internal/builtins/functionDefinitionScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import { callableSemantics } from "../../internal/support/callableSemantics.js"
import type { CallableSemantics } from "../../internal/support/callableSemanticsClass.js"
import { wordsMatch } from "../../internal/support/hasEsPluralSuffix.js"
import { isNonBooleanResult } from "../../internal/support/isNonBooleanResult.js"
import type { FunctionDefinition } from "../../internal/support/functionDefinition.js"
import { strictEqual } from "../../internal/equivalence.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { ConversionAxis } from "./conversionAxis.js"

// RequireConversionDirectionConsistencyFact exists because its fields form one stable data contract used by the linter.
export const RequireConversionDirectionConsistencyFact = Schema.Struct({
  axis: ConversionAxis,
  nameText: Schema.String,
  claimed: Schema.String,
  expected: Schema.String
})

export interface RequireConversionDirectionConsistencyFact extends Schema.Schema.Type<
  typeof RequireConversionDirectionConsistencyFact
> {}

const emptyFacts = Array.empty()
const constantEmptyFacts = Function.constant(emptyFacts)

const resultObjectOperations = HashSet.make("decode", "parse")
const sourceObjectOperations = HashSet.make("encode", "format", "serialize", "stringify")
const directionRelations = HashSet.make("from", "to")

const conversionOperations = HashSet.make(
  "decode",
  "deserialize",
  "encode",
  "format",
  "parse",
  "serialize",
  "stringify",
  "transform"
)

const claimedAgrees = (claimed: string) => (expectedWords: ReadonlyArray<string>) =>
  Array.some(expectedWords, wordsMatch(claimed))

const explicitDisagreement = (expectedWords: ReadonlyArray<string>) => (claimed: string) => {
  const disagreesWithClaimed = (words: ReadonlyArray<string>) => !claimedAgrees(claimed)(words)

  const claimedWithExpected = (words: Array.NonEmptyReadonlyArray<string>) => {
    const expected = Array.headNonEmpty(words)

    return Tuple.make(claimed, expected)
  }

  return pipe(
    Option.liftPredicate(Array.isReadonlyArrayNonEmpty)(expectedWords),
    Option.filter(disagreesWithClaimed),
    Option.map(claimedWithExpected)
  )
}

const isConversionOperation = (operation: string) => HashSet.has(conversionOperations, operation)
const isDirectionRelation = (word: string) => HashSet.has(directionRelations, word)

const isResultObjectOperation = (candidate: string) =>
  HashSet.has(resultObjectOperations, candidate)

const isSourceObjectOperation = (candidate: string) =>
  HashSet.has(sourceObjectOperations, candidate)

const hasConversionOperationOrNone = (semantics: CallableSemantics) =>
  pipe(
    semantics.name.operation,
    Option.match({
      onNone: Function.constTrue,
      onSome: isConversionOperation
    })
  )

const matches = (context: MatchContext) => {
  const semanticsFor = callableSemantics(context)

  const matchWithSemantics = (semantics: CallableSemantics) => {
    const makeFact = (axis: ConversionAxis) => (expected: string) => (claimed: string) => {
      const fact = RequireConversionDirectionConsistencyFact.make({
        axis,
        nameText: semantics.name.text,
        claimed,
        expected
      })

      return makeNodeMatch(semantics.node, fact)
    }

    const resultDisagreement = (claimed: Option.Option<string>) =>
      pipe(
        claimed,
        Option.flatMap(explicitDisagreement(semantics.result.words)),
        Option.map(([claimedWord, expected]) => makeFact("result")(expected)(claimedWord)),
        Option.toArray
      )

    const sourceDisagreement = (claimed: Option.Option<string>) =>
      pipe(
        claimed,
        Option.flatMap(explicitDisagreement(semantics.sourceWords)),
        Option.map(([claimedWord, expected]) => makeFact("source")(expected)(claimedWord)),
        Option.toArray
      )

    const completeDirectionDisagreement =
      (sourceClaim: Option.Option<string>) => (resultClaim: Option.Option<string>) => {
        const sourceCandidates = sourceDisagreement(sourceClaim)
        const resultCandidates = resultDisagreement(resultClaim)
        const disagreementAxes = Array.make(sourceCandidates, resultCandidates)
        const bothAxesDisagree = Array.every(disagreementAxes, Array.isReadonlyArrayNonEmpty)
        const flattenedDisagreements = () => Array.flatten(disagreementAxes)

        return pipe(
          Option.liftPredicate((value: boolean) => value)(bothAxesDisagree),
          Option.map(flattenedDisagreements),
          Option.getOrElse(constantEmptyFacts)
        )
      }

    const isFromRelation = strictEqual("from")
    const isToRelation = strictEqual("to")

    const fromDirectionCandidates = () =>
      completeDirectionDisagreement(semantics.name.source)(semantics.name.object)

    const toDirectionCandidates = () =>
      completeDirectionDisagreement(semantics.name.object)(semantics.name.result)

    const fromCandidates = pipe(
      semantics.name.relation,
      Option.filter(isFromRelation),
      Option.map(fromDirectionCandidates),
      Option.getOrElse(constantEmptyFacts)
    )

    const toCandidates = pipe(
      semantics.name.relation,
      Option.filter(isToRelation),
      Option.map(toDirectionCandidates),
      Option.getOrElse(constantEmptyFacts)
    )

    const hasDirectionRelation = pipe(semantics.name.relation, Option.exists(isDirectionRelation))
    const resultObjectDisagreement = () => resultDisagreement(semantics.name.object)
    const sourceObjectDisagreement = () => sourceDisagreement(semantics.name.object)

    const operationObjectCandidatesFor = (word: string) =>
      pipe(
        Match.value(word),
        Match.when(isResultObjectOperation, resultObjectDisagreement),
        Match.when(isSourceObjectOperation, sourceObjectDisagreement),
        Match.orElse(constantEmptyFacts)
      )

    const operationObjectCandidatesWhenNoDirection = () =>
      pipe(
        semantics.name.operation,
        Option.match({
          onNone: constantEmptyFacts,
          onSome: operationObjectCandidatesFor
        })
      )

    const operationObjectCandidates = pipe(
      Option.liftPredicate((value: boolean) => !value)(hasDirectionRelation),
      Option.map(operationObjectCandidatesWhenNoDirection),
      Option.getOrElse(constantEmptyFacts)
    )

    return pipe(
      fromCandidates,
      Array.appendAll(toCandidates),
      Array.appendAll(operationObjectCandidates)
    )
  }

  const matchFunctionDefinition = (scan: FunctionDefinition) =>
    pipe(
      semanticsFor(scan),
      Option.filter(isNonBooleanResult),
      Option.filter(hasConversionOperationOrNone),
      Option.map(matchWithSemantics),
      Option.getOrElse(constantEmptyFacts)
    )

  return matchFunctionDefinition
}

export const requireConversionDirectionConsistencyScanner = functionDefinitionScanner(matches)
