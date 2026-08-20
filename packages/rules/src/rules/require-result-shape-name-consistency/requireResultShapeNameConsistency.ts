import { Array, Function, HashSet, Match, Option, Schema, Struct, flow, pipe } from "effect"
import { functionDefinitionScanner } from "../../internal/builtins/functionDefinitionScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import { callableSemantics } from "../../internal/support/callableSemantics.js"
import type { CallableSemantics } from "../../internal/support/callableSemanticsClass.js"
import { isNonBooleanResult } from "../../internal/support/isNonBooleanResult.js"
import type { ResultCardinality } from "../../internal/support/resultCardinality.js"
import type { FunctionDefinition } from "../../internal/support/functionDefinition.js"
import type { CardinalityResultExpectation } from "./cardinalityResultExpectation.js"
import { ResultExpectation } from "./resultExpectation.js"
import { shapeExpectation } from "./shapeExpectation.js"
import type { ShapeResultExpectation } from "./shapeResultExpectation.js"

// RequireResultShapeNameConsistencyFact exists because its fields form one stable data contract used by the linter.
export const RequireResultShapeNameConsistencyFact = Schema.Struct({
  nameText: Schema.String,
  expected: Schema.String,
  observed: Schema.String,
  label: Schema.String
})

export interface RequireResultShapeNameConsistencyFact extends Schema.Schema.Type<
  typeof RequireResultShapeNameConsistencyFact
> {}

const numberOperations = HashSet.make("average", "count", "length", "size", "sum", "total")
const keyedOperations = HashSet.make("group", "index")
const collectionOperations = HashSet.make("filter", "map")
const optionalOneOperations = HashSet.make("head", "last")

const isNumberOperation = (candidate: string) => HashSet.has(numberOperations, candidate)
const isKeyedOperation = (candidate: string) => HashSet.has(keyedOperations, candidate)
const isCollectionOperation = (candidate: string) => HashSet.has(collectionOperations, candidate)
const isOptionalOneOperation = (candidate: string) => HashSet.has(optionalOneOperations, candidate)

const cardinalityExpectation = (expected: ResultCardinality) => (label: string) =>
  ResultExpectation.make({
    _tag: "cardinality",
    expected,
    label
  })

const numberExpectation = Function.compose(shapeExpectation("number"), Option.some)
const keyedExpectation = Function.compose(shapeExpectation("keyed"), Option.some)
const collectionExpectation = Function.compose(shapeExpectation("collection"), Option.some)
const optionalOneExpectation = Function.compose(cardinalityExpectation("optional-one"), Option.some)

const noExpectation = Option.none()
const constantNoExpectation = Function.constant(noExpectation)

const expectationForOperation = (operation: string) =>
  pipe(
    Match.value(operation),
    Match.when(isNumberOperation, numberExpectation),
    Match.when(isKeyedOperation, keyedExpectation),
    Match.when(isCollectionOperation, collectionExpectation),
    Match.when(isOptionalOneOperation, optionalOneExpectation),
    Match.orElse(constantNoExpectation)
  )

const namedExpectation = (semantics: CallableSemantics) =>
  pipe(semantics.name.operation, Option.flatMap(expectationForOperation))

const shapeExpected = Struct.get<ShapeResultExpectation, "expected">("expected")
const cardinalityExpected = Struct.get<CardinalityResultExpectation, "expected">("expected")

const observedForExpectation = (semantics: CallableSemantics) => (expectation: ResultExpectation) =>
  pipe(
    Match.value(expectation),
    Match.when({ _tag: "shape" }, Function.constant(semantics.result.shape)),
    Match.when({ _tag: "cardinality" }, Function.constant(semantics.result.cardinality)),
    Match.exhaustive
  )

const shapeContradicts = (semantics: CallableSemantics) => (expected: string) => {
  const known = semantics.result.shape !== "unknown"
  const mismatched = semantics.result.shape !== expected
  const flags = Array.make(known, mismatched)

  return Array.every(flags, Boolean)
}

const cardinalityContradicts = (semantics: CallableSemantics) => (expected: string) => {
  const known = semantics.result.cardinality !== "unknown"
  const mismatched = semantics.result.cardinality !== expected
  const flags = Array.make(known, mismatched)

  return Array.every(flags, Boolean)
}

const shapeClaimContradicts = (semantics: CallableSemantics) => {
  const contradictsExpected = shapeContradicts(semantics)

  return flow(shapeExpected, contradictsExpected)
}

const cardinalityClaimContradicts = (semantics: CallableSemantics) => {
  const contradictsExpected = cardinalityContradicts(semantics)

  return flow(cardinalityExpected, contradictsExpected)
}

const contradicts = (semantics: CallableSemantics) => (expectation: ResultExpectation) =>
  pipe(
    Match.value(expectation),
    Match.when({ _tag: "shape" }, shapeClaimContradicts(semantics)),
    Match.when({ _tag: "cardinality" }, cardinalityClaimContradicts(semantics)),
    Match.exhaustive
  )

const findingForSemantics = (semantics: CallableSemantics) =>
  Option.gen(function* () {
    const expectation = yield* namedExpectation(semantics)
    yield* Option.liftPredicate(contradicts(semantics))(expectation)

    const observed = observedForExpectation(semantics)(expectation)

    const fact = RequireResultShapeNameConsistencyFact.make({
      nameText: semantics.name.text,
      expected: expectation.expected,
      observed,
      label: expectation.label
    })

    return makeNodeMatch(semantics.node, fact)
  })

const matchesDefinition =
  (semanticsFor: (scan: FunctionDefinition) => Option.Option<CallableSemantics>) =>
  (scan: FunctionDefinition) =>
    pipe(
      semanticsFor(scan),
      Option.filter(isNonBooleanResult),
      Option.flatMap(findingForSemantics),
      Option.toArray
    )

const matches = flow(callableSemantics, matchesDefinition)

export const requireResultShapeNameConsistencyScanner = functionDefinitionScanner(matches)
