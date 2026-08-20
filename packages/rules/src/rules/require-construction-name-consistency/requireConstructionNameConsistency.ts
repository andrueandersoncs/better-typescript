import { Array, Function, Option, pipe } from "effect"
import { functionDefinitionScanner } from "../../internal/builtins/functionDefinitionScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { Match } from "../../internal/scanner/match.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { callableExpectedResultWords } from "../../internal/support/callableExpectedResultWords.js"
import { callableSemantics } from "../../internal/support/callableSemantics.js"
import type { CallableSemantics } from "../../internal/support/callableSemanticsClass.js"
import { wordsMatch } from "../../internal/support/hasEsPluralSuffix.js"
import { semanticRole } from "../../internal/support/semanticRole2.js"
import type { FunctionDefinition } from "../../internal/support/functionDefinition.js"
import { hasConstructionRole } from "./requireConstructionRole.js"
import { factoryOperation } from "./requireFactoryOperations.js"
import { hasRole } from "./requireHasRole.js"
import {
  RequireConstructionNameConsistencyFact,
  type RequireConstructionNameConsistencyFact as RequireConstructionNameConsistencyFactType
} from "./requireConstructionNameConsistencyFact.js"
import { isAllowedConstructionName } from "./requireVariantConstructors.js"

const emptyFacts: ReadonlyArray<Match<RequireConstructionNameConsistencyFactType>> = Array.empty()
const constantEmptyFacts = Function.constant(emptyFacts)

const hasFactoryClaim = Function.compose(factoryOperation, Option.isSome)

const lookupRole = semanticRole("lookup")
const projectionRole = semanticRole("projection")
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
    scan: FunctionDefinition
  ): ReadonlyArray<Match<RequireConstructionNameConsistencyFactType>> =>
    pipe(semanticsFor(scan), Option.map(matchesForSemantics), Option.getOrElse(constantEmptyFacts))

  return matchesDefinition
}

export const requireConstructionNameConsistencyScanner = functionDefinitionScanner(matches)
