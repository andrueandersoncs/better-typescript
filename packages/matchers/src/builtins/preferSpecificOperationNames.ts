import {
  Array,
  Function,
  HashMap,
  HashSet,
  Option,
  pipe,
  Tuple,
  Struct,
  flow,
  Schema
} from "effect"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  semanticRole,
  type CallableSemantics,
  type SemanticRole
} from "../support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"
import type { MatchContext } from "../matcher/data.js"

// PreferSpecificOperationNamesFact carries rename gu because role-specific words need all fields.
export const PreferSpecificOperationNamesFact = Schema.Struct({
  nameText: Schema.String,
  vague: Schema.String,
  role: Schema.String,
  renamed: Schema.String
})

export interface PreferSpecificOperationNamesFact extends Schema.Schema.Type<
  typeof PreferSpecificOperationNamesFact
> {}

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
    if (strictEqual("lookup")(role)) {
      const isOptionalTotality = strictEqual("optional")(semantics.result.totality)
      const isOptionalCardinality = strictEqual("optional-one")(semantics.result.cardinality)
      const optionalFlags = Array.make(isOptionalTotality, isOptionalCardinality)
      const optional = Array.some(optionalFlags, Boolean)

      return optional ? "find" : "get"
    }

    return pipe(
      HashMap.get(staticRoleFallbacks, role),
      Option.getOrElse(Function.constant("execute"))
    )
  }

const isStrongerRole = (role: SemanticRole) => HashSet.has(strongerRoles, role)
const isVagueOperation = (word: string) => HashSet.has(vagueOperations, word)
const isConventionalRoleNoun = (word: string) => HashSet.has(conventionalRoleNouns, word)
const isRuntimeEntry = (word: string) => HashSet.has(runtimeEntries, word)
const isConventionalEventObject = (object: string) => HashSet.has(conventionalEventObjects, object)
const isHandleOperation = strictEqual("handle")

const uniqueStrongerRole = (semantics: CallableSemantics) => {
  const hasSingleRole = flow(
    Struct.get<ReadonlyArray<SemanticRole>, "length">("length"),
    strictEqual(1)
  )

  return pipe(
    Array.fromIterable(semantics.roles),
    Array.filter(isStrongerRole),
    Option.liftPredicate(hasSingleRole),
    Option.flatMap(Array.head)
  )
}

const claimedVagueOperation = (semantics: CallableSemantics) =>
  Array.findFirst(semantics.name.words, isVagueOperation)

const preferredRoleOperation =
  (semantics: CallableSemantics) =>
  (role: SemanticRole): Option.Option<string> => {
    const operations = operationsForRole(role)
    const isPreferredOperation = (word: string) => HashSet.has(operations, word)

    return Array.findFirst(semantics.operationWords, isPreferredOperation)
  }

const suggestedOperation =
  (semantics: CallableSemantics) =>
  (role: SemanticRole): string => {
    const fallbackForRole = () => fallbackOperation(semantics)(role)

    return pipe(preferredRoleOperation(semantics)(role), Option.getOrElse(fallbackForRole))
  }

const capitalize = (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`

const camelCaseWord = (word: string, index: number) =>
  strictEqual(0)(index) ? word : capitalize(word)

const toCamelCase = (words: ReadonlyArray<string>) =>
  pipe(words, Array.map(camelCaseWord), Array.join(""))

const suggestedName =
  (vague: string) =>
  (operation: string) =>
  (semantics: CallableSemantics): string => {
    const replaceVagueWord = (word: string) => (strictEqual(vague)(word) ? operation : word)

    return pipe(semantics.name.words, Array.map(replaceVagueWord), toCamelCase)
  }

const isConventionalEntry = (semantics: CallableSemantics) => {
  const words = semantics.name.words
  const hasRoleNoun = Array.some(words, isConventionalRoleNoun)
  const isSingleWord = strictEqual(1)(words.length)
  const isRuntimeEntryWord = pipe(Array.head(words), Option.exists(isRuntimeEntry))
  const bareRuntimeEntryFlags = Array.make(isSingleWord, isRuntimeEntryWord)
  const bareRuntimeEntry = Array.every(bareRuntimeEntryFlags, Boolean)
  const vagueOperation = claimedVagueOperation(semantics)
  const claimsHandle = Option.exists(vagueOperation, isHandleOperation)
  const hasConventionalEventObject = Option.exists(semantics.name.object, isConventionalEventObject)
  const conventionalEventHandlerFlags = Array.make(claimsHandle, hasConventionalEventObject)
  const conventionalEventHandler = Array.every(conventionalEventHandlerFlags, Boolean)
  const conventionalEntryFlags = Array.make(hasRoleNoun, bareRuntimeEntry, conventionalEventHandler)

  return Array.some(conventionalEntryFlags, Boolean)
}

const matches = (context: MatchContext) => {
  const semanticsFor = callableSemantics(context)

  const matchFromSemantics = (semantics: CallableSemantics) =>
    Option.gen(function* () {
      const conventionalEntry = isConventionalEntry(semantics)
      yield* Option.liftPredicate((value: boolean) => !value)(conventionalEntry)
      const vague = yield* claimedVagueOperation(semantics)
      const role = yield* uniqueStrongerRole(semantics)
      const suggested = suggestedOperation(semantics)(role)
      const suggestedMatchesVague = strictEqual(vague)(suggested)

      yield* Option.liftPredicate((value: boolean) => !value)(suggestedMatchesVague)

      const renamed = suggestedName(vague)(suggested)(semantics)
      const renamedMatchesText = strictEqual(semantics.name.text)(renamed)

      yield* Option.liftPredicate((value: boolean) => !value)(renamedMatchesText)

      const fact = PreferSpecificOperationNamesFact.make({
        nameText: semantics.name.text,
        vague,
        role,
        renamed
      })

      return nodeMatch(semantics.node, fact)
    })

  const matchFunctionDefinition = (definition: FunctionDefinition) =>
    pipe(semanticsFor(definition), Option.flatMap(matchFromSemantics), Option.toArray)

  return matchFunctionDefinition
}

export const preferSpecificOperationNamesMatcher =
  nodeMatcher(functionDefinitionKinds)(isFunctionDefinition)(matches)
