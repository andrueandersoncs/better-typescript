import { resultBearingOperations } from "../../internal/support/operationVocabulary.js"
import { Array, Function, HashSet, Option, pipe } from "effect"
import { functionDefinitionScanner } from "../../internal/builtins/functionDefinitionScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { Match } from "../../internal/scanner/match.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { callableSemantics } from "../../internal/support/callableSemantics.js"
import type { CallableSemantics } from "../../internal/support/callableSemanticsClass.js"
import { hasWord } from "../../internal/support/hasWord.js"
import { semanticRole } from "../../internal/support/semanticRole2.js"
import type { FunctionDefinition } from "../../internal/support/functionDefinition.js"
import { strictEqual } from "../../internal/equivalence.js"
import { commandOperation } from "./commandOperations.js"
import { RequireCommandNameConsistencyFact } from "./requireCommandNameConsistencyFact.js"
import { hasCommandRole } from "./requireCommandRole.js"

const projectionRole = semanticRole("projection")

const accessorOperations = HashSet.make("find", "get", "load", "lookup", "read", "select")

const neutralRoleWords = HashSet.make("callback", "handler")

const predicateOperations = HashSet.make(
  "can",
  "contain",
  "contains",
  "does",
  "equal",
  "equals",
  "every",
  "exist",
  "exists",
  "has",
  "include",
  "includes",
  "is",
  "match",
  "matches",
  "should",
  "some"
)

const emptyFacts: ReadonlyArray<Match<RequireCommandNameConsistencyFact>> = Array.empty()
const constantEmptyFacts = Function.constant(emptyFacts)

const isNeutralCallbackOrHandler = (semantics: CallableSemantics) =>
  hasWord(semantics.name.words)(neutralRoleWords)

const isPredicateOperation = (operation: string) => HashSet.has(predicateOperations, operation)
const isAccessorOperation = (operation: string) => HashSet.has(accessorOperations, operation)

const isResultBearingOperation = (operation: string) =>
  HashSet.has(resultBearingOperations, operation)

const claimsCommandOperation = Function.compose(commandOperation, Option.isSome)

const claimsPredicateOperation = (semantics: CallableSemantics) =>
  pipe(semantics.name.operation, Option.exists(isPredicateOperation))

const hasExplicitAccessorProjectionOrResultStyle = (semantics: CallableSemantics) => {
  const projected = HashSet.has(semantics.roles, projectionRole)
  const accessorOperation = pipe(semantics.name.operation, Option.exists(isAccessorOperation))

  const resultBearingOperation = pipe(
    semantics.name.operation,
    Option.exists(isResultBearingOperation)
  )

  const hasResult = Option.isSome(semantics.name.result)
  const lacksOperation = Option.isNone(semantics.name.operation)
  const bareResultClaimConditions = Array.make(hasResult, lacksOperation)
  const bareResultClaim = Array.every(bareResultClaimConditions, Boolean)
  const signals = Array.make(projected, accessorOperation, resultBearingOperation, bareResultClaim)

  return Array.some(signals, Boolean)
}

const isNotNeutralCallbackOrHandler = (semantics: CallableSemantics) =>
  !isNeutralCallbackOrHandler(semantics)

const hasVoidResult = (candidate: CallableSemantics) => strictEqual("void")(candidate.result.shape)

const falseCommandMatch = (semantics: CallableSemantics) =>
  Option.gen(function* () {
    const operation = yield* commandOperation(semantics)
    const commandEvidence = hasCommandRole(semantics)
    yield* Option.liftPredicate((value: boolean) => !value)(commandEvidence)

    const fact = RequireCommandNameConsistencyFact.make({
      kind: "false-command",
      nameText: semantics.name.text,
      operation
    })

    return makeNodeMatch(semantics.node, fact)
  })

const hiddenCommandMatch = (semantics: CallableSemantics) =>
  Option.gen(function* () {
    yield* Option.liftPredicate(hasCommandRole)(semantics)
    yield* Option.liftPredicate(hasVoidResult)(semantics)
    const claimsCommand = claimsCommandOperation(semantics)
    const claimsPredicate = claimsPredicateOperation(semantics)
    yield* Option.liftPredicate((value: boolean) => !value)(claimsCommand)
    yield* Option.liftPredicate((value: boolean) => !value)(claimsPredicate)
    yield* Option.liftPredicate(hasExplicitAccessorProjectionOrResultStyle)(semantics)

    const fact = RequireCommandNameConsistencyFact.make({
      kind: "hidden-command",
      nameText: semantics.name.text
    })

    return makeNodeMatch(semantics.node, fact)
  })

const matchesForSemantics = (semantics: CallableSemantics) => {
  const falseClaim = falseCommandMatch(semantics)
  const hidden = hiddenCommandMatch(semantics)
  const falseMatches = Option.toArray(falseClaim)
  const hiddenMatches = Option.toArray(hidden)

  return pipe(falseMatches, Array.appendAll(hiddenMatches))
}

const matches = (context: MatchContext) => {
  const semanticsFor = callableSemantics(context)

  const matchesDefinition = (
    scan: FunctionDefinition
  ): ReadonlyArray<Match<RequireCommandNameConsistencyFact>> =>
    pipe(
      semanticsFor(scan),
      Option.filter(isNotNeutralCallbackOrHandler),
      Option.map(matchesForSemantics),
      Option.getOrElse(constantEmptyFacts)
    )

  return matchesDefinition
}

export const requireCommandNameConsistencyScanner = functionDefinitionScanner(matches)
