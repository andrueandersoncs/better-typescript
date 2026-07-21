import { Array, flow, Function, HashSet, Match, Option, pipe, Schema, Struct } from "effect"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  isNonBooleanResult,
  type CallableSemantics,
  type ResultCardinality,
  type ResultShape
} from "../support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "../support/tsNode.js"

const shapeExpectationKind = Schema.Literal("shape")
const cardinalityExpectationKind = Schema.Literal("cardinality")

// RequireResultShapeNameConsistencyFact compares shapes because naming advice cites both.
export const RequireResultShapeNameConsistencyFact = Schema.Struct({
  nameText: Schema.String,
  expected: Schema.String,
  observed: Schema.String,
  label: Schema.String
})

export interface RequireResultShapeNameConsistencyFact extends Schema.Schema.Type<
  typeof RequireResultShapeNameConsistencyFact
> {}

// ShapeResultExpectation is shape advice because operation names imply a result shape.
export const ShapeResultExpectation = Schema.Struct({
  _tag: shapeExpectationKind,
  expected: Schema.String,
  label: Schema.String
})

export interface ShapeResultExpectation extends Schema.Schema.Type<typeof ShapeResultExpectation> {}

// CardinalityResultExpectation is cardinality advice because operation names imply cardinality.
export const CardinalityResultExpectation = Schema.Struct({
  _tag: cardinalityExpectationKind,
  expected: Schema.String,
  label: Schema.String
})

export interface CardinalityResultExpectation extends Schema.Schema.Type<
  typeof CardinalityResultExpectation
> {}

const resultExpectationMembers = Array.make(ShapeResultExpectation, CardinalityResultExpectation)

// ResultExpectation unions shape and cardinality because operation advice differs by axis.
export const ResultExpectation = Schema.Union(resultExpectationMembers)

export type ResultExpectation = Schema.Schema.Type<typeof ResultExpectation>

const numberOperations = HashSet.make("average", "count", "length", "size", "sum", "total")
const keyedOperations = HashSet.make("group", "index")
const collectionOperations = HashSet.make("filter", "map")
const optionalOneOperations = HashSet.make("head", "last")

const isNumberOperation = (candidate: string) => HashSet.has(numberOperations, candidate)
const isKeyedOperation = (candidate: string) => HashSet.has(keyedOperations, candidate)
const isCollectionOperation = (candidate: string) => HashSet.has(collectionOperations, candidate)
const isOptionalOneOperation = (candidate: string) => HashSet.has(optionalOneOperations, candidate)

const shapeExpectation = (expected: ResultShape) => (label: string) =>
  ResultExpectation.make({
    _tag: "shape",
    expected,
    label
  })

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
  const shape = semantics.result.shape
  const known = shape !== "unknown"
  const mismatched = shape !== expected
  const flags = Array.make(known, mismatched)

  return Array.every(flags, Boolean)
}

const cardinalityContradicts = (semantics: CallableSemantics) => (expected: string) => {
  const cardinality = semantics.result.cardinality
  const known = cardinality !== "unknown"
  const mismatched = cardinality !== expected
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
    const expected = expectation.expected

    const fact = RequireResultShapeNameConsistencyFact.make({
      nameText: semantics.name.text,
      expected,
      observed,
      label: expectation.label
    })

    return nodeMatch(semantics.node, fact)
  })

const matchesDefinition =
  (semanticsFor: (definition: FunctionDefinition) => Option.Option<CallableSemantics>) =>
  (definition: FunctionDefinition) =>
    pipe(
      semanticsFor(definition),
      Option.filter(isNonBooleanResult),
      Option.flatMap(findingForSemantics),
      Option.toArray
    )

const matches = flow(callableSemantics, matchesDefinition)

export const requireResultShapeNameConsistencyMatcher =
  nodeMatcher(functionDefinitionKinds)(isFunctionDefinition)(matches)
