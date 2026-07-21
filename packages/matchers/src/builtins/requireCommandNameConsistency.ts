import { Array, Function, HashSet, Option, pipe, Schema } from "effect"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type Match, type MatchContext } from "../matcher/data.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  hasWord,
  semanticRole,
  type CallableSemantics
} from "../support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

const falseCommandKind = Schema.Literal("false-command")
const hiddenCommandKind = Schema.Literal("hidden-command")

// RequireCommandFalseCommandFact is false-command evidence because name and operation pair.
export const RequireCommandFalseCommandFact = Schema.Struct({
  kind: falseCommandKind,
  nameText: Schema.String,
  operation: Schema.String
})

export interface RequireCommandFalseCommandFact extends Schema.Schema.Type<
  typeof RequireCommandFalseCommandFact
> {}

// RequireCommandHiddenCommandFact is hidden-command evidence because void commands need names.
export const RequireCommandHiddenCommandFact = Schema.Struct({
  kind: hiddenCommandKind,
  nameText: Schema.String
})

export interface RequireCommandHiddenCommandFact extends Schema.Schema.Type<
  typeof RequireCommandHiddenCommandFact
> {}

const commandFactMembers = Array.make(
  RequireCommandFalseCommandFact,
  RequireCommandHiddenCommandFact
)

// RequireCommandNameConsistencyFact unions command claims because false and hidden differ.
export const RequireCommandNameConsistencyFact = Schema.Union(commandFactMembers)

export type RequireCommandNameConsistencyFact = Schema.Schema.Type<
  typeof RequireCommandNameConsistencyFact
>

const commandRole = semanticRole("command")
const projectionRole = semanticRole("projection")

const commandOperations = HashSet.make("publish", "save", "send", "write")

const accessorOperations = HashSet.make("find", "get", "load", "lookup", "read", "select")

const resultBearingOperations = HashSet.make(
  "build",
  "choose",
  "construct",
  "create",
  "decode",
  "filter",
  "find",
  "get",
  "load",
  "lookup",
  "make",
  "parse",
  "read",
  "resolve",
  "select",
  "transform"
)

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

const hasCommandRole = (semantics: CallableSemantics) => HashSet.has(semantics.roles, commandRole)

const isNeutralCallbackOrHandler = (semantics: CallableSemantics) =>
  hasWord(semantics.name.words)(neutralRoleWords)

const isCommandOperation = (operation: string) => HashSet.has(commandOperations, operation)
const isPredicateOperation = (operation: string) => HashSet.has(predicateOperations, operation)
const isAccessorOperation = (operation: string) => HashSet.has(accessorOperations, operation)

const isResultBearingOperation = (operation: string) =>
  HashSet.has(resultBearingOperations, operation)

const commandOperation = (semantics: CallableSemantics) =>
  pipe(semantics.name.operation, Option.filter(isCommandOperation))

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
    definition: FunctionDefinition
  ): ReadonlyArray<Match<RequireCommandNameConsistencyFact>> =>
    pipe(
      semanticsFor(definition),
      Option.filter(isNotNeutralCallbackOrHandler),
      Option.map(matchesForSemantics),
      Option.getOrElse(constantEmptyFacts)
    )

  return matchesDefinition
}

export const requireCommandNameConsistencyMatcher =
  nodeMatcher(functionDefinitionKinds)(isFunctionDefinition)(matches)
