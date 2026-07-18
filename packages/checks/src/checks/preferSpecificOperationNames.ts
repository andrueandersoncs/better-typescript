import { Array, Function, HashMap, HashSet, Option, Tuple, pipe } from "effect"
import { makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  isFunctionDefinition,
  semanticRole,
  type CallableSemantics,
  type SemanticRole
} from "./support/callableSemantics.js"
import type { FunctionDefinition } from "./support/tsNode.js"

const aggregationRole = semanticRole("aggregation")
const commandRole = semanticRole("command")
const constructionRole = semanticRole("construction")
const conversionRole = semanticRole("conversion")
const lookupRole = semanticRole("lookup")
const projectionRole = semanticRole("projection")

const strongerRoles = HashSet.make(
  aggregationRole,
  commandRole,
  constructionRole,
  conversionRole,
  lookupRole,
  projectionRole
)

const vagueOperations = HashSet.make("do", "execute", "handle", "manage", "process", "run")

const constructionOperations = HashSet.make("build", "construct", "create", "make", "new", "of")

const conversionOperations = HashSet.make(
  "as",
  "decode",
  "deserialize",
  "encode",
  "format",
  "parse",
  "serialize",
  "stringify",
  "to",
  "transform"
)

const lookupOperations = HashSet.make("at", "find", "get", "head", "last", "load", "lookup", "read")
const projectionOperations = HashSet.make("choose", "filter", "map", "select")

const aggregationOperations = HashSet.make(
  "aggregate",
  "average",
  "count",
  "every",
  "group",
  "index",
  "length",
  "max",
  "min",
  "reduce",
  "size",
  "some",
  "sum",
  "total"
)

const commandOperations = HashSet.make(
  "delete",
  "publish",
  "remove",
  "save",
  "send",
  "set",
  "update",
  "write"
)

const conventionalRoleNouns = HashSet.make("callback", "handler", "listener", "subscriber")
const runtimeEntries = HashSet.make("bootstrap", "init", "main", "start")

const conventionalEventObjects = HashSet.make(
  "blur",
  "change",
  "click",
  "connect",
  "disconnect",
  "error",
  "focus",
  "input",
  "keydown",
  "keyup",
  "load",
  "message",
  "resize",
  "scroll",
  "submit",
  "unload"
)

const aggregationRoleOperations = Tuple.make(aggregationRole, aggregationOperations)
const commandRoleOperations = Tuple.make(commandRole, commandOperations)
const constructionRoleOperations = Tuple.make(constructionRole, constructionOperations)
const conversionRoleOperations = Tuple.make(conversionRole, conversionOperations)
const lookupRoleOperations = Tuple.make(lookupRole, lookupOperations)
const projectionRoleOperations = Tuple.make(projectionRole, projectionOperations)

const roleOperations = HashMap.make(
  aggregationRoleOperations,
  commandRoleOperations,
  constructionRoleOperations,
  conversionRoleOperations,
  lookupRoleOperations,
  projectionRoleOperations
)

const aggregationFallback = Tuple.make(aggregationRole, "aggregate")
const commandFallback = Tuple.make(commandRole, "execute")
const constructionFallback = Tuple.make(constructionRole, "make")
const conversionFallback = Tuple.make(conversionRole, "convert")
const projectionFallback = Tuple.make(projectionRole, "select")

const staticRoleFallbacks = HashMap.make(
  aggregationFallback,
  commandFallback,
  constructionFallback,
  conversionFallback,
  projectionFallback
)

const emptyOperationSet = HashSet.empty<string>()
const constantEmptyOperationSet = Function.constant(emptyOperationSet)

const operationsForRole = (role: SemanticRole) =>
  pipe(HashMap.get(roleOperations, role), Option.getOrElse(constantEmptyOperationSet))

const fallbackOperation =
  (semantics: CallableSemantics) =>
  (role: SemanticRole): string => {
    if (role === "lookup") {
      const isOptionalTotality = semantics.result.totality === "optional"
      const isOptionalCardinality = semantics.result.cardinality === "optional-one"
      const optionalFlags = Array.make(isOptionalTotality, isOptionalCardinality)
      const optional = Array.some(optionalFlags, Boolean)

      return optional ? "find" : "get"
    }

    return pipe(
      HashMap.get(staticRoleFallbacks, role),
      Option.getOrElse(Function.constant("execute"))
    )
  }

const uniqueStrongerRole = (semantics: CallableSemantics) =>
  pipe(
    Array.fromIterable(semantics.roles),
    Array.filter((role) => HashSet.has(strongerRoles, role)),
    Option.liftPredicate((roles) => roles.length === 1),
    Option.flatMap(Array.head)
  )

const claimedVagueOperation = (semantics: CallableSemantics) =>
  Array.findFirst(semantics.name.words, (word) => HashSet.has(vagueOperations, word))

const preferredRoleOperation =
  (semantics: CallableSemantics) =>
  (role: SemanticRole): Option.Option<string> => {
    const operations = operationsForRole(role)

    return Array.findFirst(semantics.operationWords, (word) => HashSet.has(operations, word))
  }

const suggestedOperation =
  (semantics: CallableSemantics) =>
  (role: SemanticRole): string =>
    pipe(
      preferredRoleOperation(semantics)(role),
      Option.getOrElse(() => fallbackOperation(semantics)(role))
    )

const capitalize = (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`

const toCamelCase = (words: ReadonlyArray<string>) =>
  pipe(
    words,
    Array.map((word, index) => (index === 0 ? word : capitalize(word))),
    Array.join("")
  )

const suggestedName =
  (vague: string) =>
  (operation: string) =>
  (semantics: CallableSemantics): string =>
    pipe(
      semantics.name.words,
      Array.map((word) => (word === vague ? operation : word)),
      toCamelCase
    )

const isConventionalEntry = (semantics: CallableSemantics) => {
  const words = semantics.name.words
  const hasRoleNoun = Array.some(words, (word) => HashSet.has(conventionalRoleNouns, word))
  const isSingleWord = words.length === 1

  const isRuntimeEntryWord = pipe(
    Array.head(words),
    Option.exists((word) => HashSet.has(runtimeEntries, word))
  )

  const bareRuntimeEntryFlags = Array.make(isSingleWord, isRuntimeEntryWord)
  const bareRuntimeEntry = Array.every(bareRuntimeEntryFlags, Boolean)
  const vagueOperation = claimedVagueOperation(semantics)
  const claimsHandle = Option.exists(vagueOperation, (operation) => operation === "handle")

  const hasConventionalEventObject = Option.exists(semantics.name.object, (object) =>
    HashSet.has(conventionalEventObjects, object)
  )

  const conventionalEventHandlerFlags = Array.make(claimsHandle, hasConventionalEventObject)
  const conventionalEventHandler = Array.every(conventionalEventHandlerFlags, Boolean)
  const conventionalEntryFlags = Array.make(hasRoleNoun, bareRuntimeEntry, conventionalEventHandler)

  return Array.some(conventionalEntryFlags, Boolean)
}

const specificOperationNameMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const semanticsFor = callableSemantics(context)

  const matches = (definition: FunctionDefinition): ReadonlyArray<Detection> =>
    pipe(
      semanticsFor(definition),
      Option.flatMap((semantics) =>
        Option.gen(function* () {
          const conventionalEntry = isConventionalEntry(semantics)
          yield* Option.liftPredicate((value: boolean) => !value)(conventionalEntry)
          const vague = yield* claimedVagueOperation(semantics)
          const role = yield* uniqueStrongerRole(semantics)
          const suggested = suggestedOperation(semantics)(role)
          yield* Option.liftPredicate((value: boolean) => !value)(suggested === vague)
          const renamed = suggestedName(vague)(suggested)(semantics)
          yield* Option.liftPredicate((value: boolean) => !value)(renamed === semantics.name.text)

          return match({
            node: semantics.node,
            message:
              `${semantics.name.text} uses the vague operation ${vague}, but its body has a ` +
              `unique ${role} role.`,
            hint: `Rename to ${renamed}, preserving the known object or result noun.`
          })
        })
      ),
      Option.toArray
    )

  return matches
}

export const preferSpecificOperationNames = makeCheck(
  "prefer-specific-operation-names",
  functionDefinitionKinds,
  isFunctionDefinition,
  specificOperationNameMatches
)
