import { Array, Function, HashSet, Match, Option, pipe, Tuple } from "effect"
import { makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  isNonBooleanResult,
  wordsMatch,
  type CallableSemantics
} from "./support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "./support/tsNode.js"

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const constantEmptyDetections = Function.constant(emptyDetections)

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

// ConversionAxis is claim side because Match.exhaustive must reject unknown conversion axes.
type ConversionAxis = "result" | "source"

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

const conversionDirectionMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const semanticsFor = callableSemantics(context)

  const disagreementDetection =
    (semantics: CallableSemantics) =>
    (axis: ConversionAxis) =>
    (claimed: string, expected: string): Detection => {
      const message = pipe(
        Match.value(axis),
        Match.when(
          "result",
          () =>
            `${semantics.name.text} names its conversion result as ${claimed}, but it returns ${expected}.`
        ),
        Match.when(
          "source",
          () =>
            `${semantics.name.text} names its conversion source as ${claimed}, but its source is ${expected}.`
        ),
        Match.exhaustive
      )

      const hint = pipe(
        Match.value(axis),
        Match.when(
          "result",
          () =>
            `Rename the result phrase to ${expected}, or return a value whose concept is ${claimed}.`
        ),
        Match.when(
          "source",
          () =>
            `Rename the source phrase to ${expected}, or accept a parameter whose concept is ${claimed}.`
        ),
        Match.exhaustive
      )

      return match({
        node: semantics.node,
        message,
        hint
      })
    }

  const matches = (definition: FunctionDefinition): ReadonlyArray<Detection> =>
    pipe(
      semanticsFor(definition),
      Option.filter(isNonBooleanResult),
      Option.filter(hasConversionOperationOrNone),
      Option.map((semantics) => {
        const report = disagreementDetection(semantics)
        const relation = semantics.name.relation
        const operation = semantics.name.operation
        const resultWords = semantics.result.words
        const sourceWords = semantics.sourceWords

        const reportResultDisagreement = ([claimedWord, expected]: readonly [string, string]) =>
          report("result")(claimedWord, expected)

        const reportSourceDisagreement = ([claimedWord, expected]: readonly [string, string]) =>
          report("source")(claimedWord, expected)

        const resultDisagreement = (claimed: Option.Option<string>) =>
          pipe(
            claimed,
            Option.flatMap(explicitDisagreement(resultWords)),
            Option.map(reportResultDisagreement),
            Option.toArray
          )

        const sourceDisagreement = (claimed: Option.Option<string>) =>
          pipe(
            claimed,
            Option.flatMap(explicitDisagreement(sourceWords)),
            Option.map(reportSourceDisagreement),
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
            Option.getOrElse(constantEmptyDetections)
          )
        }

        const isFromRelation = (word: string) => word === "from"
        const isToRelation = (word: string) => word === "to"

        const fromDirectionDetections = () =>
          completeDirectionDisagreement(semantics.name.source, semantics.name.object)

        const toDirectionDetections = () =>
          completeDirectionDisagreement(semantics.name.object, semantics.name.result)

        const fromDetections = pipe(
          relation,
          Option.filter(isFromRelation),
          Option.map(fromDirectionDetections),
          Option.getOrElse(constantEmptyDetections)
        )

        const toDetections = pipe(
          relation,
          Option.filter(isToRelation),
          Option.map(toDirectionDetections),
          Option.getOrElse(constantEmptyDetections)
        )

        const hasDirectionRelation = pipe(relation, Option.exists(isDirectionRelation))
        const resultObjectDisagreement = () => resultDisagreement(semantics.name.object)
        const sourceObjectDisagreement = () => sourceDisagreement(semantics.name.object)

        const operationObjectDetectionsFor = (word: string) =>
          pipe(
            Match.value(word),
            Match.when(isResultObjectOperation, resultObjectDisagreement),
            Match.when(isSourceObjectOperation, sourceObjectDisagreement),
            Match.orElse(constantEmptyDetections)
          )

        const operationObjectDetectionsWhenNoDirection = () =>
          pipe(
            operation,
            Option.match({
              onNone: constantEmptyDetections,
              onSome: operationObjectDetectionsFor
            })
          )

        const operationObjectDetections = pipe(
          Option.liftPredicate((value: boolean) => !value)(hasDirectionRelation),
          Option.map(operationObjectDetectionsWhenNoDirection),
          Option.getOrElse(constantEmptyDetections)
        )

        return pipe(
          fromDetections,
          Array.appendAll(toDetections),
          Array.appendAll(operationObjectDetections)
        )
      }),
      Option.getOrElse(constantEmptyDetections)
    )

  return matches
}

export const requireConversionDirectionConsistency = makeCheck(
  "require-conversion-direction-consistency",
  functionDefinitionKinds,
  isFunctionDefinition,
  conversionDirectionMatches
)
