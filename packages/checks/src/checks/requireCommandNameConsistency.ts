import { Array, Function, HashSet, Option, pipe } from "effect"
import { makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  hasWord,
  semanticRole,
  type CallableSemantics
} from "./support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "./support/tsNode.js"

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

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const constantEmptyDetections = Function.constant(emptyDetections)

const hasCommandRole = (semantics: CallableSemantics) => HashSet.has(semantics.roles, commandRole)

const isNeutralCallbackOrHandler = (semantics: CallableSemantics) =>
  hasWord(semantics.name.words)(neutralRoleWords)

const commandOperation = (semantics: CallableSemantics) =>
  pipe(
    semantics.name.operation,
    Option.filter((operation) => HashSet.has(commandOperations, operation))
  )

const claimsCommandOperation = Function.compose(commandOperation, Option.isSome)

const claimsPredicateOperation = (semantics: CallableSemantics) =>
  pipe(
    semantics.name.operation,
    Option.exists((operation) => HashSet.has(predicateOperations, operation))
  )

const hasExplicitAccessorProjectionOrResultStyle = (semantics: CallableSemantics) => {
  const projected = HashSet.has(semantics.roles, projectionRole)

  const accessorOperation = pipe(
    semantics.name.operation,
    Option.exists((operation) => HashSet.has(accessorOperations, operation))
  )

  const resultBearingOperation = pipe(
    semantics.name.operation,
    Option.exists((operation) => HashSet.has(resultBearingOperations, operation))
  )

  const hasResult = Option.isSome(semantics.name.result)
  const lacksOperation = Option.isNone(semantics.name.operation)
  const bareResultClaimConditions = Array.make(hasResult, lacksOperation)
  const bareResultClaim = Array.every(bareResultClaimConditions, Boolean)
  const signals = Array.make(projected, accessorOperation, resultBearingOperation, bareResultClaim)

  return Array.some(signals, Boolean)
}

const commandNameConsistencyMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const semanticsFor = callableSemantics(context)

  const falseCommandClaim = (semantics: CallableSemantics) =>
    Option.gen(function* () {
      const operation = yield* commandOperation(semantics)
      const commandEvidence = hasCommandRole(semantics)
      yield* Option.liftPredicate((value: boolean) => !value)(commandEvidence)

      return match({
        node: semantics.node,
        message: `${semantics.name.text} claims the command ${operation}, but its result and body do not provide command evidence.`,
        hint: "Rename away from the command verb, or implement a true command with a void or Effect.void result."
      })
    })

  const hiddenCommand = (semantics: CallableSemantics) =>
    Option.gen(function* () {
      yield* Option.liftPredicate(hasCommandRole)(semantics)
      yield* Option.liftPredicate(
        (candidate: CallableSemantics) => candidate.result.shape === "void"
      )(semantics)
      const claimsCommand = claimsCommandOperation(semantics)
      const claimsPredicate = claimsPredicateOperation(semantics)
      yield* Option.liftPredicate((value: boolean) => !value)(claimsCommand)
      yield* Option.liftPredicate((value: boolean) => !value)(claimsPredicate)
      yield* Option.liftPredicate(hasExplicitAccessorProjectionOrResultStyle)(semantics)

      return match({
        node: semantics.node,
        message: `${semantics.name.text} is a void command named like an accessor, projection, or result, not a command.`,
        hint: "Rename with command language such as save, write, send, publish, set, update, remove, or delete."
      })
    })

  const matches = (definition: FunctionDefinition): ReadonlyArray<Detection> =>
    pipe(
      semanticsFor(definition),
      Option.filter((semantics) => !isNeutralCallbackOrHandler(semantics)),
      Option.map((semantics) => {
        const falseClaim = falseCommandClaim(semantics)
        const hidden = hiddenCommand(semantics)

        return pipe(Array.make(falseClaim, hidden), Array.flatMap(Option.toArray))
      }),
      Option.getOrElse(constantEmptyDetections)
    )

  return matches
}

export const requireCommandNameConsistency = makeCheck(
  "require-command-name-consistency",
  functionDefinitionKinds,
  isFunctionDefinition,
  commandNameConsistencyMatches
)
