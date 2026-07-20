import { Array, HashSet, Match, Option, pipe } from "effect"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeDetection } from "@better-typescript/core/engine/check"

import { makeCheck } from "../defineCheck.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  isNonBooleanResult,
  type CallableSemantics,
  type ResultCardinality,
  type ResultShape
} from "./support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "./support/tsNode.js"

// ResultExpectation is one closed claim because shape and cardinality share one match surface.
type ResultExpectation =
  | {
      readonly _tag: "shape"
      readonly expected: ResultShape
      readonly label: string
    }
  | {
      readonly _tag: "cardinality"
      readonly expected: ResultCardinality
      readonly label: string
    }

const numberOperations = HashSet.make("average", "count", "length", "size", "sum", "total")
const keyedOperations = HashSet.make("group", "index")
const collectionOperations = HashSet.make("filter", "map")
const optionalOneOperations = HashSet.make("head", "last")

const isNumberOperation = (candidate: string) => HashSet.has(numberOperations, candidate)
const isKeyedOperation = (candidate: string) => HashSet.has(keyedOperations, candidate)
const isCollectionOperation = (candidate: string) => HashSet.has(collectionOperations, candidate)
const isOptionalOneOperation = (candidate: string) => HashSet.has(optionalOneOperations, candidate)

const numberExpectation = (label: string): Option.Option<ResultExpectation> =>
  Option.some({
    _tag: "shape",
    expected: "number",
    label
  })

const keyedExpectation = (label: string): Option.Option<ResultExpectation> =>
  Option.some({
    _tag: "shape",
    expected: "keyed",
    label
  })

const collectionExpectation = (label: string): Option.Option<ResultExpectation> =>
  Option.some({
    _tag: "shape",
    expected: "collection",
    label
  })

const optionalOneExpectation = (label: string): Option.Option<ResultExpectation> =>
  Option.some({
    _tag: "cardinality",
    expected: "optional-one",
    label
  })

const expectationForOperation = (operation: string) =>
  pipe(
    Match.value(operation),
    Match.when(isNumberOperation, numberExpectation),
    Match.when(isKeyedOperation, keyedExpectation),
    Match.when(isCollectionOperation, collectionExpectation),
    Match.when(isOptionalOneOperation, optionalOneExpectation),
    Match.orElse(() => Option.none())
  )

const namedExpectation = (semantics: CallableSemantics) =>
  pipe(semantics.name.operation, Option.flatMap(expectationForOperation))

const contradicts =
  (semantics: CallableSemantics) =>
  (expectation: ResultExpectation): boolean => {
    const shape = semantics.result.shape
    const cardinality = semantics.result.cardinality

    return pipe(
      Match.value(expectation),
      Match.tag("shape", (claim) => {
        const expectedShape = claim.expected
        const known = shape !== "unknown"
        const mismatched = shape !== expectedShape
        const flags = Array.make(known, mismatched)

        return Array.every(flags, Boolean)
      }),
      Match.tag("cardinality", (claim) => {
        const expectedCardinality = claim.expected
        const known = cardinality !== "unknown"
        const mismatched = cardinality !== expectedCardinality
        const flags = Array.make(known, mismatched)

        return Array.every(flags, Boolean)
      }),
      Match.exhaustive
    )
  }

const resultShapeNameMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const semanticsFor = callableSemantics(context)

  const detectionFor = (semantics: CallableSemantics) =>
    Option.gen(function* () {
      const expectation = yield* namedExpectation(semantics)
      yield* Option.liftPredicate(contradicts(semantics))(expectation)

      const observed = pipe(
        Match.value(expectation),
        Match.tag("shape", () => semantics.result.shape),
        Match.tag("cardinality", () => semantics.result.cardinality),
        Match.exhaustive
      )

      const expected = pipe(
        Match.value(expectation),
        Match.tag("shape", (claim) => {
          const expectedShape = claim.expected

          return expectedShape
        }),
        Match.tag("cardinality", (claim) => {
          const expectedCardinality = claim.expected

          return expectedCardinality
        }),
        Match.exhaustive
      )

      return match({
        node: semantics.node,
        message:
          `${semantics.name.text} claims a ${expected} result via ${expectation.label}, ` +
          `but returns ${observed}.`,
        hint:
          `Align the name with the actual result, or change the return type to ${expected}. ` +
          `Keep strong operation words only when the result shape matches.`
      })
    })

  const matches = (definition: FunctionDefinition): ReadonlyArray<Detection> =>
    pipe(
      semanticsFor(definition),
      Option.filter(isNonBooleanResult),
      Option.flatMap(detectionFor),
      Option.toArray
    )

  return matches
}

export const requireResultShapeNameConsistency = makeCheck(
  "require-result-shape-name-consistency",
  functionDefinitionKinds,
  isFunctionDefinition,
  resultShapeNameMatches
)
