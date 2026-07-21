import { Array, Function, HashSet, Match, Option, pipe, Tuple, Schema } from "effect"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch } from "../matcher/data.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  isNonBooleanResult,
  wordsMatch,
  type CallableSemantics
} from "../support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"
import type { MatchContext } from "../matcher/data.js"

const conversionAxes = Array.make<["result", "source"]>("result", "source")

// ConversionAxis classifies conversion direction because axis advice differs.
export const ConversionAxis = Schema.Literals(conversionAxes)

export type ConversionAxis = typeof ConversionAxis.Type

// RequireConversionDirectionConsistencyFact pairs direction words because naming advice needs both.
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
    const relation = semantics.name.relation
    const operation = semantics.name.operation
    const resultWords = semantics.result.words
    const sourceWords = semantics.sourceWords

    const makeFact = (axis: ConversionAxis) => (claimed: string, expected: string) => {
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
        Option.flatMap(explicitDisagreement(resultWords)),
        Option.map(([claimedWord, expected]) => makeFact("result")(claimedWord, expected)),
        Option.toArray
      )

    const sourceDisagreement = (claimed: Option.Option<string>) =>
      pipe(
        claimed,
        Option.flatMap(explicitDisagreement(sourceWords)),
        Option.map(([claimedWord, expected]) => makeFact("source")(claimedWord, expected)),
        Option.toArray
      )

    const completeDirectionDisagreement = (
      sourceClaim: Option.Option<string>,
      resultClaim: Option.Option<string>
    ) => {
      const sourceDetections = sourceDisagreement(sourceClaim)
      const resultDetections = resultDisagreement(resultClaim)
      const disagreementAxes = Array.make(sourceDetections, resultDetections)
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

    const fromDirectionDetections = () =>
      completeDirectionDisagreement(semantics.name.source, semantics.name.object)

    const toDirectionDetections = () =>
      completeDirectionDisagreement(semantics.name.object, semantics.name.result)

    const fromDetections = pipe(
      relation,
      Option.filter(isFromRelation),
      Option.map(fromDirectionDetections),
      Option.getOrElse(constantEmptyFacts)
    )

    const toDetections = pipe(
      relation,
      Option.filter(isToRelation),
      Option.map(toDirectionDetections),
      Option.getOrElse(constantEmptyFacts)
    )

    const hasDirectionRelation = pipe(relation, Option.exists(isDirectionRelation))
    const resultObjectDisagreement = () => resultDisagreement(semantics.name.object)
    const sourceObjectDisagreement = () => sourceDisagreement(semantics.name.object)

    const operationObjectDetectionsFor = (word: string) =>
      pipe(
        Match.value(word),
        Match.when(isResultObjectOperation, resultObjectDisagreement),
        Match.when(isSourceObjectOperation, sourceObjectDisagreement),
        Match.orElse(constantEmptyFacts)
      )

    const operationObjectDetectionsWhenNoDirection = () =>
      pipe(
        operation,
        Option.match({
          onNone: constantEmptyFacts,
          onSome: operationObjectDetectionsFor
        })
      )

    const operationObjectDetections = pipe(
      Option.liftPredicate((value: boolean) => !value)(hasDirectionRelation),
      Option.map(operationObjectDetectionsWhenNoDirection),
      Option.getOrElse(constantEmptyFacts)
    )

    return pipe(
      fromDetections,
      Array.appendAll(toDetections),
      Array.appendAll(operationObjectDetections)
    )
  }

  const matchFunctionDefinition = (definition: FunctionDefinition) =>
    pipe(
      semanticsFor(definition),
      Option.filter(isNonBooleanResult),
      Option.filter(hasConversionOperationOrNone),
      Option.map(matchWithSemantics),
      Option.getOrElse(constantEmptyFacts)
    )

  return matchFunctionDefinition
}

export const requireConversionDirectionConsistencyMatcher =
  nodeMatcher(functionDefinitionKinds)(isFunctionDefinition)(matches)
