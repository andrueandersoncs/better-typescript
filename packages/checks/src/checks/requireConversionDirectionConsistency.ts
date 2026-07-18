import { Array, Function, HashSet, Match, Option, pipe, Tuple } from "effect"
import { makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  isFunctionDefinition,
  wordsMatch,
  type CallableSemantics
} from "./support/callableSemantics.js"
import type { FunctionDefinition } from "./support/tsNode.js"

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

const explicitDisagreement = (expectedWords: ReadonlyArray<string>) => (claimed: string) =>
  pipe(
    Option.liftPredicate(Array.isReadonlyArrayNonEmpty)(expectedWords),
    Option.filter((words) => !claimedAgrees(claimed)(words)),
    Option.map((words) => Tuple.make(claimed, words[0]))
  )

// ConversionAxis is claim side because Match.exhaustive must reject unknown conversion axes.
type ConversionAxis = "result" | "source"

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
      Option.filter((semantics) => semantics.result.shape !== "boolean"),
      Option.filter((semantics) =>
        pipe(
          semantics.name.operation,
          Option.match({
            onNone: Function.constTrue,
            onSome: (operation) => HashSet.has(conversionOperations, operation)
          })
        )
      ),
      Option.map((semantics) => {
        const report = disagreementDetection(semantics)
        const relation = semantics.name.relation
        const operation = semantics.name.operation
        const resultWords = semantics.result.words
        const sourceWords = semantics.sourceWords

        const resultDisagreement = (claimed: Option.Option<string>) =>
          pipe(
            claimed,
            Option.flatMap(explicitDisagreement(resultWords)),
            Option.map(([claimedWord, expected]) => report("result")(claimedWord, expected)),
            Option.toArray
          )

        const sourceDisagreement = (claimed: Option.Option<string>) =>
          pipe(
            claimed,
            Option.flatMap(explicitDisagreement(sourceWords)),
            Option.map(([claimedWord, expected]) => report("source")(claimedWord, expected)),
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

          return pipe(
            Option.liftPredicate((value: boolean) => value)(bothAxesDisagree),
            Option.map(() => Array.flatten(disagreementAxes)),
            Option.getOrElse(constantEmptyDetections)
          )
        }

        const fromDetections = pipe(
          relation,
          Option.filter((word) => word === "from"),
          Option.map(() =>
            completeDirectionDisagreement(semantics.name.source, semantics.name.object)
          ),
          Option.getOrElse(constantEmptyDetections)
        )

        const toDetections = pipe(
          relation,
          Option.filter((word) => word === "to"),
          Option.map(() =>
            completeDirectionDisagreement(semantics.name.object, semantics.name.result)
          ),
          Option.getOrElse(constantEmptyDetections)
        )

        const hasDirectionRelation = pipe(
          relation,
          Option.exists((word) => HashSet.has(directionRelations, word))
        )

        const operationObjectDetections = pipe(
          Option.liftPredicate((value: boolean) => !value)(hasDirectionRelation),
          Option.map(() =>
            pipe(
              operation,
              Option.match({
                onNone: constantEmptyDetections,
                onSome: (word) =>
                  pipe(
                    Match.value(word),
                    Match.when(
                      (candidate) => HashSet.has(resultObjectOperations, candidate),
                      () => resultDisagreement(semantics.name.object)
                    ),
                    Match.when(
                      (candidate) => HashSet.has(sourceObjectOperations, candidate),
                      () => sourceDisagreement(semantics.name.object)
                    ),
                    Match.orElse(constantEmptyDetections)
                  )
              })
            )
          ),
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
