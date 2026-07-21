import { Array, Function, HashSet, Option, pipe, Schema } from "effect"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type Match, type MatchContext } from "../matcher/data.js"
import {
  callableSemantics,
  callableExpectedResultWords,
  functionDefinitionKinds,
  semanticRole,
  wordsMatch,
  type CallableSemantics,
  type SemanticRole
} from "../support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

const factoryMasqueradeKind = Schema.Literal("factory-masquerade")
const unnamedConstructionKind = Schema.Literal("unnamed-construction")

// RequireConstructionFactoryMasqueradeFact is masquerade evidence because name and operation pair.
export const RequireConstructionFactoryMasqueradeFact = Schema.Struct({
  kind: factoryMasqueradeKind,
  nameText: Schema.String,
  operation: Schema.String
})

export interface RequireConstructionFactoryMasqueradeFact extends Schema.Schema.Type<
  typeof RequireConstructionFactoryMasqueradeFact
> {}

// RequireConstructionUnnamedFact is unnamed-construction evidence because builders need verbs.
export const RequireConstructionUnnamedConstructionFact = Schema.Struct({
  kind: unnamedConstructionKind,
  nameText: Schema.String
})

export interface RequireConstructionUnnamedConstructionFact extends Schema.Schema.Type<
  typeof RequireConstructionUnnamedConstructionFact
> {}

const constructionFactMembers = Array.make(
  RequireConstructionFactoryMasqueradeFact,
  RequireConstructionUnnamedConstructionFact
)

// RequireConstructionNameConsistencyFact unions claims because masquerade and unnamed differ.
export const RequireConstructionNameConsistencyFact = Schema.Union(constructionFactMembers)

export type RequireConstructionNameConsistencyFact = Schema.Schema.Type<
  typeof RequireConstructionNameConsistencyFact
>

const factoryOperations = HashSet.make("build", "construct", "create", "make")
const variantConstructors = HashSet.make("fail", "left", "none", "of", "right", "some", "succeed")

const emptyFacts: ReadonlyArray<Match<RequireConstructionNameConsistencyFact>> = Array.empty()
const constantEmptyFacts = Function.constant(emptyFacts)

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

const factoryMasqueradeMatch = (semantics: CallableSemantics) =>
  Option.gen(function* () {
    const operation = yield* factoryOperation(semantics)
    const hasConstruction = hasConstructionRole(semantics)
    const allowed = isAllowedConstructionName(semantics)
    yield* Option.liftPredicate((value: boolean) => !value)(hasConstruction)
    yield* Option.liftPredicate((value: boolean) => !value)(allowed)
    yield* Option.liftPredicate(hasFactoryMasquerade)(semantics)

    const fact = RequireConstructionNameConsistencyFact.make({
      kind: "factory-masquerade",
      nameText: semantics.name.text,
      operation
    })

    return makeNodeMatch(semantics.node, fact)
  })

const unnamedConstructionMatch = (semantics: CallableSemantics) =>
  Option.gen(function* () {
    yield* Option.liftPredicate(hasConstructionRole)(semantics)
    const factoryClaim = hasFactoryClaim(semantics)
    const allowed = isAllowedConstructionName(semantics)
    yield* Option.liftPredicate((value: boolean) => !value)(factoryClaim)
    yield* Option.liftPredicate((value: boolean) => !value)(allowed)
    yield* Option.liftPredicate(resultNounAgreesOrAbsent)(semantics)

    const fact = RequireConstructionNameConsistencyFact.make({
      kind: "unnamed-construction",
      nameText: semantics.name.text
    })

    return makeNodeMatch(semantics.node, fact)
  })

const matchesForSemantics = (semantics: CallableSemantics) => {
  const factoryContradiction = factoryMasqueradeMatch(semantics)
  const unnamedContradiction = unnamedConstructionMatch(semantics)
  const factoryMatches = Option.toArray(factoryContradiction)
  const unnamedMatches = Option.toArray(unnamedContradiction)

  return pipe(factoryMatches, Array.appendAll(unnamedMatches))
}

const matches = (context: MatchContext) => {
  const semanticsFor = callableSemantics(context)

  const matchesDefinition = (
    definition: FunctionDefinition
  ): ReadonlyArray<Match<RequireConstructionNameConsistencyFact>> =>
    pipe(
      semanticsFor(definition),
      Option.map(matchesForSemantics),
      Option.getOrElse(constantEmptyFacts)
    )

  return matchesDefinition
}

export const requireConstructionNameConsistencyMatcher =
  nodeMatcher(functionDefinitionKinds)(isFunctionDefinition)(matches)
