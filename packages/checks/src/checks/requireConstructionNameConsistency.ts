import { Array, Function, HashSet, Option, pipe } from "effect"
import { makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import {
  callableSemantics,
  callableExpectedResultWords,
  functionDefinitionKinds,
  semanticRole,
  wordsMatch,
  type CallableSemantics,
  type SemanticRole
} from "./support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "./support/tsNode.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const factoryOperations = HashSet.make("build", "construct", "create", "make")
const variantConstructors = HashSet.make("fail", "left", "none", "of", "right", "some", "succeed")

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const constantEmptyDetections = Function.constant(emptyDetections)

const hasRole =
  (role: SemanticRole) =>
  (semantics: CallableSemantics): boolean =>
    HashSet.has(semantics.roles, role)

const isExactSingleWord = (word: string) => (semantics: CallableSemantics) => {
  const singleWord = strictEqual(1)(semantics.name.words.length)
  const firstWord = Array.head(semantics.name.words)
  const matchesWord = Option.contains(firstWord, word)
  const conditions = Array.make(singleWord, matchesWord)

  return Array.every(conditions, Boolean)
}

const isBareMake = isExactSingleWord("make")

const isExactVariantConstructor = (semantics: CallableSemantics) => {
  const words = semantics.name.words
  const singleWord = strictEqual(1)(words.length)

  const isKnownVariantWord = (word: string) => {
    const knownVariant = HashSet.has(variantConstructors, word)
    const conditions = Array.make(singleWord, knownVariant)

    return Array.every(conditions, Boolean)
  }

  return pipe(Array.head(words), Option.exists(isKnownVariantWord))
}

const isAllowedConstructionName = (semantics: CallableSemantics) => {
  const bareMake = isBareMake(semantics)
  const exactVariant = isExactVariantConstructor(semantics)
  const checks = Array.make(bareMake, exactVariant)

  return Array.some(checks, Boolean)
}

const isFactoryOperation = (operation: string) => HashSet.has(factoryOperations, operation)

const factoryOperation = (semantics: CallableSemantics) =>
  pipe(semantics.name.operation, Option.filter(isFactoryOperation))

const hasFactoryClaim = Function.compose(factoryOperation, Option.isSome)

const constructionRole = semanticRole("construction")
const lookupRole = semanticRole("lookup")
const projectionRole = semanticRole("projection")
const hasConstructionRole = hasRole(constructionRole)
const hasLookupRole = hasRole(lookupRole)
const hasProjectionRole = hasRole(projectionRole)

const hasFactoryMasquerade = (semantics: CallableSemantics) => {
  const lookup = hasLookupRole(semantics)
  const projection = hasProjectionRole(semantics)
  const lookupOrProjection = Array.make(lookup, projection)

  return Array.some(lookupOrProjection, Boolean)
}

const resultNounAgreesOrAbsent = (semantics: CallableSemantics) => {
  const agreesWithClaimed = (claimed: string) => {
    const expected = callableExpectedResultWords(semantics)

    return Array.some(expected, wordsMatch(claimed))
  }

  return pipe(
    semantics.name.result,
    Option.match({
      onNone: Function.constTrue,
      onSome: agreesWithClaimed
    })
  )
}

const constructionNameMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const semanticsFor = callableSemantics(context)

  const factoryClaimContradiction = (semantics: CallableSemantics) =>
    Option.gen(function* () {
      const operation = yield* factoryOperation(semantics)
      const hasConstruction = hasConstructionRole(semantics)
      const allowed = isAllowedConstructionName(semantics)
      yield* Option.liftPredicate((value: boolean) => !value)(hasConstruction)
      yield* Option.liftPredicate((value: boolean) => !value)(allowed)
      yield* Option.liftPredicate(hasFactoryMasquerade)(semantics)

      return match({
        node: semantics.node,
        message: `${semantics.name.text} claims factory construction via ${operation}, but looks up or projects existing data.`,
        hint: "Rename with lookup or projection vocabulary, or return a freshly constructed value."
      })
    })

  const unnamedConstructionContradiction = (semantics: CallableSemantics) =>
    Option.gen(function* () {
      yield* Option.liftPredicate(hasConstructionRole)(semantics)
      const factoryClaim = hasFactoryClaim(semantics)
      const allowed = isAllowedConstructionName(semantics)
      yield* Option.liftPredicate((value: boolean) => !value)(factoryClaim)
      yield* Option.liftPredicate((value: boolean) => !value)(allowed)
      yield* Option.liftPredicate(resultNounAgreesOrAbsent)(semantics)

      return match({
        node: semantics.node,
        message: `${semantics.name.text} constructs a value, but does not use construction vocabulary.`,
        hint:
          "Rename with make/create/build/construct (for example makeUser), or use a recognized " +
          "variant constructor such as some/none/left/right/succeed/fail/of."
      })
    })

  const matches = (definition: FunctionDefinition): ReadonlyArray<Detection> =>
    pipe(
      semanticsFor(definition),
      Option.map((semantics) => {
        const factoryContradiction = factoryClaimContradiction(semantics)
        const unnamedContradiction = unnamedConstructionContradiction(semantics)

        return pipe(
          Array.make(factoryContradiction, unnamedContradiction),
          Array.flatMap(Option.toArray)
        )
      }),
      Option.getOrElse(constantEmptyDetections)
    )

  return matches
}

export const requireConstructionNameConsistency = makeCheck(
  "require-construction-name-consistency",
  functionDefinitionKinds,
  isFunctionDefinition,
  constructionNameMatches
)
