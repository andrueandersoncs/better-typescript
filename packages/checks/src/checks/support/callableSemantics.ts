import {
  Array,
  Data,
  Function,
  HashMap,
  HashSet,
  Match,
  MutableRef,
  Option,
  pipe,
  Result,
  Struct,
  Tuple
} from "effect"
import * as ts from "typescript"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { CheckContext } from "@better-typescript/core/engine/check/data"

import {
  declarationListIsConst,
  isFunctionInitializer,
  returnStatementExpression,
  symbolDeclarations,
  unwrapCallee,
  unwrapCarrier,
  variableDeclarationInitializer,
  type FunctionDefinition
} from "./tsNode.js"
import { isObjectType } from "./tsType.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

// ResultShape is the shared runtime result category because every naming policy compares one shape.
export type ResultShape =
  | "boolean"
  | "callable"
  | "collection"
  | "keyed"
  | "number"
  | "object"
  | "string"
  | "unknown"
  | "void"

// ResultCardinality is shared because naming policies must classify one result cardinality.
export type ResultCardinality = "keyed" | "many" | "one" | "optional-one" | "unknown"

// ResultTotality is shared because naming policies must classify one result totality.
export type ResultTotality = "fallible" | "optional" | "total" | "unknown"

// ResultExecution is shared because naming policies must classify one execution boundary.
export type ResultExecution = "effect" | "promise" | "pure"

// SemanticRole is shared because naming policies must use one callable behavior vocabulary.
export type SemanticRole =
  "aggregation" | "command" | "construction" | "conversion" | "lookup" | "projection"

export const semanticRole = (role: SemanticRole) => role

// CallableNameClaims keeps one parsed name grammar because every policy consumes the same claims.
class CallableNameClaims extends Data.Class<{
  readonly text: string
  readonly words: ReadonlyArray<string>
  readonly operation: Option.Option<string>
  readonly object: Option.Option<string>
  readonly result: Option.Option<string>
  readonly relation: Option.Option<string>
  readonly source: Option.Option<string>
}> {}

// ProjectionEvidence stores one traced result because policies compare its terminal noun.
class ProjectionEvidence extends Data.Class<{
  readonly path: ReadonlyArray<string>
  readonly resultWords: ReadonlyArray<string>
}> {}

// CallableResultSemantics shares one result model because every naming policy consumes it.
class CallableResultSemantics extends Data.Class<{
  readonly returnType: ts.Type
  readonly words: ReadonlyArray<string>
  readonly shape: ResultShape
  readonly cardinality: ResultCardinality
  readonly totality: ResultTotality
  readonly execution: ResultExecution
}> {}

// CallableSemantics shares one function analysis because every naming policy consumes it.
export class CallableSemantics extends Data.Class<{
  readonly definition: FunctionDefinition
  readonly node: ts.Identifier
  readonly name: CallableNameClaims
  readonly result: CallableResultSemantics
  readonly sourceWords: ReadonlyArray<string>
  readonly operationWords: ReadonlyArray<string>
  readonly projection: Option.Option<ProjectionEvidence>
  readonly roles: HashSet.HashSet<SemanticRole>
}> {}

export const functionDefinitionKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.MethodDeclaration
)

const emptyExpressions: ReadonlyArray<ts.Expression> = Array.empty()
const emptyStrings: ReadonlyArray<string> = Array.empty()
const emptySymbols: ReadonlyArray<ts.Symbol> = Array.empty()
const emptyTypes: ReadonlyArray<ts.Type> = Array.empty()
const constantEmptyStrings = Function.constant(emptyStrings)
const constantEmptyTypes = Function.constant(emptyTypes)
const noneIdentifier = Option.none<ts.Identifier>()
const noneProjectionOrigin = Option.none<ProjectionOrigin>()
const noneString = Option.none<string>()
const noneType = Option.none<ts.Type>()
const constantNoneIdentifier = Function.constant(noneIdentifier)
const constantNoneProjectionOrigin = Function.constant(noneProjectionOrigin)

export const callableExpectedResultWords = (semantics: CallableSemantics): ReadonlyArray<string> =>
  pipe(
    semantics.projection,
    Option.map(Struct.get("resultWords")),
    Option.filter(Array.isReadonlyArrayNonEmpty),
    Option.getOrElse(() => semantics.result.words)
  )

const identifierWordPattern = /[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+/gu
const relationWords = HashSet.make("at", "by", "for", "from", "of", "to")

const modifierWords = HashSet.make(
  "all",
  "async",
  "effect",
  "maybe",
  "optional",
  "try",
  "uncached",
  "unsafe"
)

const operationWords = HashSet.make(
  "add",
  "append",
  "aggregate",
  "average",
  "build",
  "can",
  "choose",
  "collect",
  "construct",
  "contains",
  "count",
  "create",
  "decode",
  "delete",
  "dispose",
  "deserialize",
  "does",
  "encode",
  "every",
  "filter",
  "find",
  "format",
  "get",
  "group",
  "handle",
  "has",
  "index",
  "is",
  "load",
  "lookup",
  "make",
  "manage",
  "map",
  "matches",
  "parse",
  "on",
  "process",
  "publish",
  "print",
  "read",
  "reduce",
  "remove",
  "resolve",
  "release",
  "run",
  "save",
  "select",
  "send",
  "serialize",
  "set",
  "should",
  "some",
  "sum",
  "transform",
  "update",
  "stop",
  "write"
)

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

const carrierWords = HashSet.make(
  "array",
  "chunk",
  "effect",
  "either",
  "generator",
  "hashmap",
  "hashset",
  "iterable",
  "iterator",
  "map",
  "option",
  "promise",
  "readonlyarray",
  "readonlymap",
  "readonlyset",
  "record",
  "result",
  "set",
  "stream"
)

const collectionWords = HashSet.make(
  "array",
  "chunk",
  "generator",
  "hashset",
  "iterable",
  "iterator",
  "readonlyarray",
  "readonlyset",
  "set",
  "stream"
)

const keyedWords = HashSet.make("hashmap", "map", "readonlymap", "record")
const optionalWords = HashSet.make("maybe", "option")
const fallibleWords = HashSet.make("either", "result")
const effectWords = HashSet.make("effect")
const promiseWords = HashSet.make("promise")

const constructionOperations = HashSet.make("build", "construct", "create", "make", "new")
const lookupOperations = HashSet.make("at", "find", "get", "head", "last", "load", "lookup", "read")

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
  "collect",
  "delete",
  "dispose",
  "load",
  "on",
  "print",
  "publish",
  "release",
  "remove",
  "save",
  "send",
  "set",
  "stop",
  "update",
  "write"
)

const unsupportedPayloadFlags =
  ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never | ts.TypeFlags.Void

const nullishFlags = ts.TypeFlags.Null | ts.TypeFlags.Undefined

const literalText = Struct.get<ts.StringLiteralLike, "text">("text")
const symbolName = (symbol: ts.Symbol) => symbol.getName()
const matchIdentifierWords = (text: string) => text.match(identifierWordPattern)
const lowercaseWord = (word: string) => word.toLowerCase()
const lowercaseWords = Array.map(lowercaseWord)

export const identifierWords: (text: string) => ReadonlyArray<string> = Function.flow(
  matchIdentifierWords,
  Option.fromNullishOr,
  Option.map(lowercaseWords),
  Option.getOrElse(constantEmptyStrings)
)

const symbolIdentifierWords = Function.compose(symbolName, identifierWords)
const esPluralSuffixes = Array.make("s", "x", "z", "ch", "sh")

const hasEsPluralSuffix = (word: string) => {
  const matchesPluralSuffix = (suffix: string) => word.endsWith(suffix)

  return Array.some(esPluralSuffixes, matchesPluralSuffix)
}

export const wordsMatch =
  (expected: string) =>
  (actual: string): boolean => {
    const exact = strictEqual(actual, expected)
    const actualIsPlural = strictEqual(actual, `${expected}s`)
    const expectedIsPlural = strictEqual(expected, `${actual}s`)
    const expectedSupportsEsPlural = hasEsPluralSuffix(expected)
    const actualMatchesExpectedEsPlural = strictEqual(actual, `${expected}es`)
    const actualEsPluralChecks = Array.make(expectedSupportsEsPlural, actualMatchesExpectedEsPlural)
    const actualIsEsPlural = Array.every(actualEsPluralChecks, Boolean)
    const actualSupportsEsPlural = hasEsPluralSuffix(actual)
    const expectedMatchesActualEsPlural = strictEqual(expected, `${actual}es`)
    const expectedEsPluralChecks = Array.make(actualSupportsEsPlural, expectedMatchesActualEsPlural)
    const expectedIsEsPlural = Array.every(expectedEsPluralChecks, Boolean)
    const expectedEndsInY = expected.endsWith("y")
    const actualEndsInIes = actual.endsWith("ies")
    const expectedStem = expected.slice(0, -1)
    const actualStem = actual.slice(0, -3)
    const stemsMatchActualYPlural = strictEqual(expectedStem, actualStem)

    const actualYPluralChecks = Array.make(
      expectedEndsInY,
      actualEndsInIes,
      stemsMatchActualYPlural
    )

    const actualIsYPlural = Array.every(actualYPluralChecks, Boolean)
    const actualEndsInY = actual.endsWith("y")
    const expectedEndsInIes = expected.endsWith("ies")
    const actualSingularStem = actual.slice(0, -1)
    const expectedPluralStem = expected.slice(0, -3)
    const stemsMatchExpectedYPlural = strictEqual(actualSingularStem, expectedPluralStem)

    const expectedYPluralChecks = Array.make(
      actualEndsInY,
      expectedEndsInIes,
      stemsMatchExpectedYPlural
    )

    const expectedIsYPlural = Array.every(expectedYPluralChecks, Boolean)

    const checks = Array.make(
      exact,
      actualIsPlural,
      expectedIsPlural,
      actualIsEsPlural,
      expectedIsEsPlural,
      actualIsYPlural,
      expectedIsYPlural
    )

    return Array.some(checks, Boolean)
  }

export const hasWord = (words: ReadonlyArray<string>) => (candidates: HashSet.HashSet<string>) => {
  const wordInCandidates = (word: string) => HashSet.has(candidates, word)

  return Array.some(words, wordInCandidates)
}

const symbolResultWords = (symbol: Option.Option<ts.Symbol>): ReadonlyArray<string> =>
  pipe(symbol, Option.map(symbolIdentifierWords), Option.getOrElse(constantEmptyStrings))

export const typeResultWords = (type: ts.Type): ReadonlyArray<string> => {
  const directSymbol = type.getSymbol()
  const aliasWords = pipe(Option.fromNullishOr(type.aliasSymbol), symbolResultWords)
  const directWords = pipe(Option.fromNullishOr(directSymbol), symbolResultWords)

  return pipe(aliasWords, Array.appendAll(directWords), Array.dedupe)
}

const normalizedSymbolName = (symbol: ts.Symbol) =>
  pipe(symbolIdentifierWords(symbol), Array.join(""))

const symbolHasCarrierName = (symbol: Option.Option<ts.Symbol>) => {
  const nameIsCarrier = (name: string) => HashSet.has(carrierWords, name)

  return pipe(symbol, Option.map(normalizedSymbolName), Option.exists(nameIsCarrier))
}

const isNamedCarrierType = (type: ts.Type) => {
  const aliasCarrier = pipe(Option.fromNullishOr(type.aliasSymbol), symbolHasCarrierName)
  const directSymbol = type.getSymbol()
  const directCarrier = pipe(Option.fromNullishOr(directSymbol), symbolHasCarrierName)

  return aliasCarrier || directCarrier
}

const makeRelationEntry = (word: string, index: number) => {
  const entry = Tuple.make(word, index)

  return HashSet.has(relationWords, word) ? Option.some(entry) : Option.none()
}

const firstRelation = (words: ReadonlyArray<string>) =>
  pipe(
    words,
    Array.filterMap((word, index) =>
      pipe(makeRelationEntry(word, index), Result.fromOption(Function.constVoid))
    ),
    Array.head
  )

const isModifierWord = (word: string) => HashSet.has(modifierWords, word)
const isOperationWord = (word: string) => HashSet.has(operationWords, word)
const isNonModifierWord = (word: string) => !HashSet.has(modifierWords, word)

const firstOperation = (words: ReadonlyArray<string>) =>
  pipe(words, Array.dropWhile(isModifierWord), Array.head, Option.filter(isOperationWord))

const semanticNouns = (words: ReadonlyArray<string>) => Array.filter(words, isNonModifierWord)

const makeCallableNameClaims = (node: ts.Identifier) => {
  const words = identifierWords(node.text)
  const operation = firstOperation(words)
  const relationEntryOption = firstRelation(words)
  const relationEntryWord = ([word]: readonly [string, number]) => word
  const relationEntryIndex = ([, index]: readonly [string, number]) => index
  const takeWordsBefore = (index: number) => Array.take(words, index)
  const dropWordsAfter = (index: number) => Array.drop(words, index + 1)
  const relationIsToWord = (word: string) => strictEqual(word, "to")
  const operationClaimsResultWord = (word: string) => HashSet.has(resultBearingOperations, word)
  const relation = pipe(relationEntryOption, Option.map(relationEntryWord))
  const relationIndex = pipe(relationEntryOption, Option.map(relationEntryIndex))

  const beforeRelation = pipe(
    relationIndex,
    Option.map(takeWordsBefore),
    Option.getOrElse(Function.constant(words))
  )

  const afterRelation = pipe(
    relationIndex,
    Option.map(dropWordsAfter),
    Option.getOrElse(constantEmptyStrings)
  )

  const beforeNouns = semanticNouns(beforeRelation)
  const claimedNouns = Option.isSome(operation) ? Array.drop(beforeNouns, 1) : beforeNouns
  const afterNouns = semanticNouns(afterRelation)
  const object = pipe(claimedNouns, Array.last)
  const relationIsTo = Option.exists(relation, relationIsToWord)
  const resultFromRelation = relationIsTo ? pipe(afterNouns, Array.last) : object
  const operationClaimsResult = Option.exists(operation, operationClaimsResultWord)
  const hasNoOperation = Option.isNone(operation)
  const hasRelation = Option.isSome(relation)
  const resultClaimChecks = Array.make(operationClaimsResult, hasNoOperation, hasRelation)
  const claimsResult = Array.some(resultClaimChecks, Boolean)
  const result = claimsResult ? resultFromRelation : noneString
  const sourceNouns = relationIsTo ? claimedNouns : afterNouns
  const source = pipe(sourceNouns, Array.last)

  return new CallableNameClaims({
    text: node.text,
    words,
    operation,
    object,
    result,
    relation,
    source
  })
}

const identifierName = Option.liftPredicate(ts.isIdentifier)

// NamedOwnerDeclaration is shared because owner lookup reads one declaration name field.
type NamedOwnerDeclaration = ts.VariableDeclaration | ts.PropertyAssignment | ts.PropertyDeclaration

const namedDeclarationIdentifier = (declaration: NamedOwnerDeclaration) =>
  identifierName(declaration.name)

const ownerName = (definition: FunctionDefinition) =>
  pipe(
    Match.value(definition.parent),
    Match.when(ts.isVariableDeclaration, namedDeclarationIdentifier),
    Match.when(ts.isPropertyAssignment, namedDeclarationIdentifier),
    Match.when(ts.isPropertyDeclaration, namedDeclarationIdentifier),
    Match.orElse(constantNoneIdentifier)
  )

export const functionName = (definition: FunctionDefinition) => {
  const directName = pipe(Option.fromNullishOr(definition.name), Option.flatMap(identifierName))
  const enclosingName = ownerName(definition)

  return pipe(directName, Option.orElse(Function.constant(enclosingName)))
}

const enclosingFunctionLike = (node: ts.Node): Option.Option<ts.SignatureDeclaration> => {
  const parentFunctionLike = (parent: ts.Node): Option.Option<ts.SignatureDeclaration> =>
    ts.isFunctionLike(parent) ? Option.some(parent) : enclosingFunctionLike(parent)

  return pipe(Option.fromNullishOr(node.parent), Option.flatMap(parentFunctionLike))
}

const ownedReturnExpressions = (definition: FunctionDefinition) => {
  const returnOwnedByDefinition = (statement: ts.ReturnStatement) => {
    const ownerIsDefinition = (owner: ts.SignatureDeclaration) => strictEqual(owner, definition)

    return pipe(enclosingFunctionLike(statement), Option.exists(ownerIsDefinition))
  }

  const appendReturnedExpression =
    (expressions: ReadonlyArray<ts.Expression>) => (returned: ts.Expression) =>
      Array.append(expressions, returned)

  return Function.flip(
    foldAst<ReadonlyArray<ts.Expression>>((expressions, node) =>
      pipe(
        node,
        Option.liftPredicate(ts.isReturnStatement),
        Option.filter(returnOwnedByDefinition),
        Option.flatMap(returnStatementExpression),
        Option.match({
          onNone: Function.constant(expressions),
          onSome: appendReturnedExpression(expressions)
        })
      )
    )
  )(emptyExpressions)
}

export const resultExpressions = (definition: FunctionDefinition): ReadonlyArray<ts.Expression> => {
  const body = definition.body

  if (!body) {
    return emptyExpressions
  }

  return ts.isBlock(body) ? ownedReturnExpressions(definition)(body) : Array.of(body)
}

export const singleResultExpression = (definition: FunctionDefinition) => {
  const hasSingleExpression = (expressions: ReadonlyArray<ts.Expression>) =>
    strictEqual(expressions.length, 1)

  return pipe(
    resultExpressions(definition),
    Option.liftPredicate(hasSingleExpression),
    Option.flatMap(Array.head)
  )
}

const semanticDefinitions =
  (remainingDepth: number) =>
  (definition: FunctionDefinition): ReadonlyArray<FunctionDefinition> => {
    const nestedDefinition = pipe(
      singleResultExpression(definition),
      Option.map(unwrapCarrier),
      Option.filter(isFunctionInitializer)
    )

    const atLimit = strictEqual(remainingDepth, 0)

    return pipe(
      nestedDefinition,
      Option.filter(() => !atLimit),
      Option.match({
        onNone: () => Array.of(definition),
        onSome: (nested) =>
          pipe(semanticDefinitions(remainingDepth - 1)(nested), Array.prepend(definition))
      })
    )
  }

const callableDefinitions = semanticDefinitions(4)

const terminalDefinition = (definition: FunctionDefinition) =>
  pipe(callableDefinitions(definition), Array.last, Option.getOrElse(Function.constant(definition)))

const parameterSymbols =
  (checker: ts.TypeChecker) =>
  (definition: FunctionDefinition): ReadonlyArray<ts.Symbol> => {
    const parameterSymbol = (parameter: ts.ParameterDeclaration) => {
      const symbolAtName = (name: ts.Identifier) =>
        pipe(checker.getSymbolAtLocation(name), Option.fromNullishOr)

      return pipe(
        Option.liftPredicate(ts.isIdentifier)(parameter.name),
        Option.flatMap(symbolAtName),
        Result.fromOption(Function.constVoid)
      )
    }

    return Array.filterMap(definition.parameters, parameterSymbol)
  }

const objectTypeIsReference = (candidate: ts.ObjectType) =>
  pipe(candidate.objectFlags & ts.ObjectFlags.Reference, Boolean)

const objectTypeIsTuple = (candidate: ts.ObjectType) =>
  pipe(candidate.objectFlags & ts.ObjectFlags.Tuple, Boolean)

const typeArgumentsOfReference = (checker: ts.TypeChecker) => (candidate: ts.ObjectType) =>
  checker.getTypeArguments(candidate as ts.TypeReference)

const objectTypeReferenceArguments =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): ReadonlyArray<ts.Type> =>
    pipe(
      type,
      Option.liftPredicate(isObjectType),
      Option.filter(objectTypeIsReference),
      Option.map(typeArgumentsOfReference(checker)),
      Option.getOrElse(constantEmptyTypes)
    )

const nestedTypes =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): ReadonlyArray<ts.Type> => {
    const unionMembers = type.isUnion() ? type.types : emptyTypes
    const aliasArguments = type.aliasTypeArguments ?? emptyTypes
    const referenceArguments = objectTypeReferenceArguments(checker)(type)

    return pipe(
      unionMembers,
      Array.appendAll(aliasArguments),
      Array.appendAll(referenceArguments),
      Array.dedupeWith((self, that) => strictEqual(self, that))
    )
  }

const isTupleType = (type: ts.Type) =>
  pipe(Option.liftPredicate(isObjectType)(type), Option.exists(objectTypeIsTuple))

const typeContainsNullish = (type: ts.Type) => {
  const ownNullish = (type.flags & nullishFlags) !== 0
  const nestedNullish = type.isUnion() && Array.some(type.types, typeContainsNullish)
  const checks = Array.make(ownNullish, nestedNullish)

  return Array.some(checks, Boolean)
}

const carrierPayload = (checker: ts.TypeChecker) => {
  const children = nestedTypes(checker)

  const payloadFromType = (type: ts.Type) => {
    const words = typeResultWords(type)
    const isCarrier = isNamedCarrierType(type)
    const aliasArguments = type.aliasTypeArguments ?? emptyTypes
    const referenceArguments = objectTypeReferenceArguments(checker)(type)
    const explicitArguments = Array.appendAll(aliasArguments, referenceArguments)
    const nested = children(type)
    const isNonNullishType = (candidate: ts.Type) => strictEqual(candidate.flags & nullishFlags, 0)
    const withoutNullish = Array.filter(nested, isNonNullishType)

    const fallbackCandidates = Array.isReadonlyArrayNonEmpty(withoutNullish)
      ? withoutNullish
      : nested

    const candidates = Array.isReadonlyArrayNonEmpty(explicitArguments)
      ? explicitArguments
      : fallbackCandidates

    const keyed = hasWord(words)(keyedWords)
    const selected = keyed ? Array.last(candidates) : Array.head(candidates)

    return isCarrier ? selected : Option.some(type)
  }

  return payloadFromType
}

const payloadType =
  (checker: ts.TypeChecker) =>
  (returnType: ts.Type): ts.Type => {
    const payload = carrierPayload(checker)

    const visit = (current: ts.Type, remainingDepth: number): ts.Type => {
      const next = payload(current)
      const nextType = pipe(next, Option.getOrElse(Function.constant(current)))
      const unchanged = strictEqual(nextType, current)
      const depthExhausted = strictEqual(remainingDepth, 0)
      const completionFlags = Array.make(depthExhausted, unchanged)
      const complete = Array.some(completionFlags, Boolean)

      return complete ? current : visit(nextType, remainingDepth - 1)
    }

    return visit(returnType, 4)
  }

const singleNonNullishMember = (type: ts.Type) => {
  const members = type.isUnion() ? type.types : emptyTypes
  const isNonNullishType = (candidate: ts.Type) => strictEqual(candidate.flags & nullishFlags, 0)
  const nonNullish = Array.filter(members, isNonNullishType)

  const hasSingleCandidate = (candidates: ReadonlyArray<ts.Type>) =>
    strictEqual(candidates.length, 1)

  return pipe(nonNullish, Option.liftPredicate(hasSingleCandidate), Option.flatMap(Array.head))
}

const typeLayerWords =
  (checker: ts.TypeChecker) =>
  (root: ts.Type): ReadonlyArray<string> => {
    const payload = carrierPayload(checker)

    const visit =
      (remainingDepth: number) =>
      (current: ts.Type): ReadonlyArray<string> => {
        const namedCarrier = isNamedCarrierType(current)
        const words = namedCarrier ? typeResultWords(current) : emptyStrings

        if (strictEqual(remainingDepth, 0)) {
          return words
        }

        const carrierMember = namedCarrier
          ? pipe(
              payload(current),
              Option.filter((candidate) => candidate !== current)
            )
          : noneType

        const next = pipe(
          carrierMember,
          Option.orElse(() => singleNonNullishMember(current))
        )

        const nestedWords = pipe(
          next,
          Option.map(visit(remainingDepth - 1)),
          Option.getOrElse(constantEmptyStrings)
        )

        return pipe(words, Array.appendAll(nestedWords), Array.dedupe)
      }

    return visit(4)(root)
  }

const resultShape =
  (checker: ts.TypeChecker) =>
  (returnType: ts.Type) =>
  (payload: ts.Type): ResultShape => {
    const returnWords = typeLayerWords(checker)(returnType)
    const payloadFlags = payload.flags
    const isVoid = (payloadFlags & (ts.TypeFlags.Void | ts.TypeFlags.Undefined)) !== 0
    const isBoolean = (payloadFlags & ts.TypeFlags.BooleanLike) !== 0
    const isNumber = (payloadFlags & ts.TypeFlags.NumberLike) !== 0
    const isString = (payloadFlags & ts.TypeFlags.StringLike) !== 0
    const isCallable = payload.getCallSignatures().length > 0
    const isKeyed = hasWord(returnWords)(keyedWords)
    const isCollection = hasWord(returnWords)(collectionWords)
    const isObject = (payloadFlags & ts.TypeFlags.Object) !== 0

    return pipe(
      Match.value(true),
      Match.when(Function.constant(isVoid), Function.constant<ResultShape>("void")),
      Match.when(Function.constant(isBoolean), Function.constant<ResultShape>("boolean")),
      Match.when(Function.constant(isNumber), Function.constant<ResultShape>("number")),
      Match.when(Function.constant(isString), Function.constant<ResultShape>("string")),
      Match.when(Function.constant(isCallable), Function.constant<ResultShape>("callable")),
      Match.when(Function.constant(isKeyed), Function.constant<ResultShape>("keyed")),
      Match.when(Function.constant(isCollection), Function.constant<ResultShape>("collection")),
      Match.when(Function.constant(isObject), Function.constant<ResultShape>("object")),
      Match.orElse(Function.constant<ResultShape>("unknown"))
    )
  }

const resultTotality =
  (checker: ts.TypeChecker) =>
  (returnType: ts.Type) =>
  (payload: ts.Type): ResultTotality => {
    const words = typeLayerWords(checker)(returnType)
    const namedOptional = hasWord(words)(optionalWords)
    const returnNullish = typeContainsNullish(returnType)
    const payloadNullish = typeContainsNullish(payload)
    const optionalFlags = Array.make(namedOptional, returnNullish, payloadNullish)
    const optional = Array.some(optionalFlags, Boolean)
    const fallible = hasWord(words)(fallibleWords)
    const unknown = (payload.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0

    return pipe(
      Match.value(true),
      Match.when(Function.constant(optional), Function.constant<ResultTotality>("optional")),
      Match.when(Function.constant(fallible), Function.constant<ResultTotality>("fallible")),
      Match.when(Function.constant(unknown), Function.constant<ResultTotality>("unknown")),
      Match.orElse(Function.constant<ResultTotality>("total"))
    )
  }

const resultExecution =
  (checker: ts.TypeChecker) =>
  (returnType: ts.Type): ResultExecution => {
    const words = typeLayerWords(checker)(returnType)
    const effect = hasWord(words)(effectWords)
    const promise = hasWord(words)(promiseWords)

    return pipe(
      Match.value(true),
      Match.when(Function.constant(effect), Function.constant<ResultExecution>("effect")),
      Match.when(Function.constant(promise), Function.constant<ResultExecution>("promise")),
      Match.orElse(Function.constant<ResultExecution>("pure"))
    )
  }

const resultCardinality =
  (shape: ResultShape) =>
  (totality: ResultTotality): ResultCardinality => {
    const keyed = strictEqual(shape, "keyed")
    const many = strictEqual(shape, "collection")
    const optional = strictEqual(totality, "optional")
    const unknown = strictEqual(shape, "unknown")

    return pipe(
      Match.value(true),
      Match.when(Function.constant(keyed), Function.constant<ResultCardinality>("keyed")),
      Match.when(Function.constant(many), Function.constant<ResultCardinality>("many")),
      Match.when(Function.constant(optional), Function.constant<ResultCardinality>("optional-one")),
      Match.when(Function.constant(unknown), Function.constant<ResultCardinality>("unknown")),
      Match.orElse(Function.constant<ResultCardinality>("one"))
    )
  }

const terminalCallableReturnType =
  (checker: ts.TypeChecker) =>
  (root: ts.Type): ts.Type => {
    const visit = (remainingDepth: number, current: ts.Type): ts.Type => {
      const hasSingleSignature = (signatures: ReadonlyArray<ts.Signature>) =>
        strictEqual(signatures.length, 1)

      const signature = pipe(
        current.getCallSignatures(),
        Option.liftPredicate(hasSingleSignature),
        Option.flatMap(Array.head),
        Option.filter(() => remainingDepth > 0)
      )

      const returned = pipe(
        signature,
        Option.map((candidate) => checker.getReturnTypeOfSignature(candidate)),
        Option.filter((candidate) => candidate !== current)
      )

      return pipe(
        returned,
        Option.match({
          onNone: Function.constant(current),
          onSome: (candidate) => visit(remainingDepth - 1, candidate)
        })
      )
    }

    return visit(4, root)
  }

const callableResult = (checker: ts.TypeChecker) => (definition: FunctionDefinition) =>
  pipe(
    checker.getSignatureFromDeclaration(definition),
    Option.fromNullishOr,
    Option.map((signature) => checker.getReturnTypeOfSignature(signature)),
    Option.map(terminalCallableReturnType(checker)),
    Option.map((returnType) => {
      const payload = payloadType(checker)(returnType)
      const returnWords = typeResultWords(returnType)
      const isNonCarrierWord = (word: string) => !HashSet.has(carrierWords, word)

      const words = pipe(
        typeResultWords(payload),
        Array.appendAll(returnWords),
        Array.filter(isNonCarrierWord),
        Array.dedupe
      )

      const shape = resultShape(checker)(returnType)(payload)
      const totality = resultTotality(checker)(returnType)(payload)
      const cardinality = resultCardinality(shape)(totality)
      const execution = resultExecution(checker)(returnType)

      return new CallableResultSemantics({
        returnType,
        words,
        shape,
        cardinality,
        totality,
        execution
      })
    })
  )

const firstVariableDeclaration = (candidates: ReadonlyArray<ts.Declaration>) =>
  Array.findFirst(candidates, ts.isVariableDeclaration)

const constVariableInitializer = (symbol: ts.Symbol) => {
  const declarationIsConst = (declaration: ts.VariableDeclaration) => {
    const declarationList = Option.liftPredicate(ts.isVariableDeclarationList)(declaration.parent)

    return Option.exists(declarationList, declarationListIsConst)
  }

  return pipe(
    symbol,
    symbolDeclarations,
    Option.fromNullishOr,
    Option.flatMap(firstVariableDeclaration),
    Option.filter(declarationIsConst),
    Option.flatMap(variableDeclarationInitializer)
  )
}

// ProjectionOrigin tracks recursive provenance because aliases and wrappers share traversal.
class ProjectionOrigin extends Data.Class<{
  readonly path: ReadonlyArray<string>
  readonly head: Option.Option<string>
  readonly resultWords: ReadonlyArray<string>
  readonly valueType: ts.Type
}> {}

const isNonRelationWord = (word: string) => !HashSet.has(relationWords, word)

const resultHead = (text: string) =>
  pipe(identifierWords(text), Array.takeWhile(isNonRelationWord), Array.last)

const resultHeadsFor =
  (projectionHead: string) =>
  (valueType: ts.Type): ReadonlyArray<string> =>
    pipe(typeResultWords(valueType), Array.prepend(projectionHead), Array.dedupe)

const supportsPayloadComparison = (type: ts.Type) =>
  strictEqual(type.flags & unsupportedPayloadFlags, 0)

const carriedPayloadType =
  (checker: ts.TypeChecker) =>
  (sourceType: ts.Type) =>
  (containerType: ts.Type): Option.Option<ts.Type> => {
    const children = nestedTypes(checker)

    const visit =
      (remainingDepth: number) =>
      (candidate: ts.Type): Option.Option<ts.Type> => {
        const supported = supportsPayloadComparison(candidate)
        const flowsFromSource = checker.isTypeAssignableTo(candidate, sourceType)
        const matchChecks = Array.make(supported, flowsFromSource)
        const matches = Array.every(matchChecks, Boolean)
        const atLimit = strictEqual(remainingDepth, 0)
        const nested = children(candidate)
        const nextDepth = remainingDepth - 1
        const descended = pipe(nested, Array.map(visit(nextDepth)), Option.firstSomeOf)
        const matched = matches ? Option.some(candidate) : noneType
        const fallback = atLimit ? noneType : descended

        return pipe(matched, Option.orElse(Function.constant(fallback)))
      }

    return pipe(children(containerType), Array.map(visit(4)), Option.firstSomeOf)
  }

const isResultCarrierType = (type: ts.Type) => {
  const namedCarrier = isNamedCarrierType(type)
  const nonTuple = !isTupleType(type)
  const union = type.isUnion()
  const namedNonTupleFlags = Array.make(namedCarrier, nonTuple)
  const namedNonTuple = Array.every(namedNonTupleFlags, Boolean)
  const checks = Array.make(union, namedNonTuple)

  return Array.some(checks, Boolean)
}

const isThisExpression = (node: ts.Node): node is ts.ThisExpression =>
  strictEqual(node.kind, ts.SyntaxKind.ThisKeyword)

const projectionEvidence =
  (checker: ts.TypeChecker) =>
  (definition: FunctionDefinition): Option.Option<ProjectionEvidence> => {
    const symbolsFor = parameterSymbols(checker)
    const definitions = callableDefinitions(definition)
    const terminal = terminalDefinition(definition)
    const bindings = Array.flatMap(definitions, symbolsFor)
    const carriedTypeFrom = carriedPayloadType(checker)

    const projectionOrigin =
      (currentBindings: ReadonlyArray<ts.Symbol>) =>
      (visitedSymbols: ReadonlyArray<ts.Symbol>) =>
      (expression: ts.Expression): Option.Option<ProjectionOrigin> => {
        const current = unwrapCarrier(expression)
        const analyze = projectionOrigin(currentBindings)(visitedSymbols)

        const identifierOrigin = (identifier: ts.Identifier) => {
          const symbol = pipe(checker.getSymbolAtLocation(identifier), Option.fromNullishOr)
          const valueType = checker.getTypeAtLocation(identifier)

          const directOrigin = new ProjectionOrigin({
            path: emptyStrings,
            head: noneString,
            resultWords: emptyStrings,
            valueType
          })

          const isCurrentBinding = (candidate: ts.Symbol) => {
            const bindingIsCandidate = (binding: ts.Symbol) => strictEqual(binding, candidate)

            return Array.some(currentBindings, bindingIsCandidate)
          }

          const isUnvisitedSymbol = (candidate: ts.Symbol) => {
            const visitedIsCandidate = (visited: ts.Symbol) => strictEqual(visited, candidate)

            return !Array.some(visitedSymbols, visitedIsCandidate)
          }

          const originFromAlias = (candidate: ts.Symbol) => {
            const initializer = constVariableInitializer(candidate)
            const nextVisited = Array.append(visitedSymbols, candidate)
            const analyzeInitializer = projectionOrigin(currentBindings)(nextVisited)

            return pipe(initializer, Option.flatMap(analyzeInitializer))
          }

          const direct = pipe(symbol, Option.filter(isCurrentBinding), Option.as(directOrigin))

          return pipe(
            direct,
            Option.orElse(() =>
              pipe(symbol, Option.filter(isUnvisitedSymbol), Option.flatMap(originFromAlias))
            )
          )
        }

        const accessOrigin = (access: ts.PropertyAccessExpression) =>
          Option.gen(function* () {
            const base = yield* analyze(access.expression)
            const head = yield* resultHead(access.name.text)
            const path = Array.append(base.path, access.name.text)
            const valueType = checker.getTypeAtLocation(access)
            const resultWords = pipe(valueType, resultHeadsFor(head))
            const optionalHead = Option.some(head)

            return new ProjectionOrigin({
              path,
              head: optionalHead,
              resultWords,
              valueType
            })
          })

        const elementOrigin = (access: ts.ElementAccessExpression) =>
          Option.gen(function* () {
            const argument = yield* Option.fromNullishOr(access.argumentExpression)
            const literal = yield* Option.liftPredicate(ts.isStringLiteralLike)(argument)
            const key = literalText(literal)
            const base = yield* analyze(access.expression)
            const head = yield* resultHead(key)
            const path = Array.append(base.path, key)
            const valueType = checker.getTypeAtLocation(access)
            const resultWords = pipe(valueType, resultHeadsFor(head))
            const optionalHead = Option.some(head)

            return new ProjectionOrigin({
              path,
              head: optionalHead,
              resultWords,
              valueType
            })
          })

        const directCarrierNames = HashSet.make(
          "fromNullishOr",
          "of",
          "liftPredicate",
          "resolve",
          "present",
          "some",
          "succeed",
          "success"
        )

        const callOrigin = (call: ts.CallExpression) => {
          const returnType = checker.getTypeAtLocation(call)
          const carrier = Option.liftPredicate(isResultCarrierType)(returnType)

          return pipe(
            carrier,
            Option.flatMap(() => {
              const makeCarriedOrigin = (origin: ProjectionOrigin) =>
                pipe(
                  carriedTypeFrom(origin.valueType)(returnType),
                  Option.map((payloadType) => {
                    const containerWords = typeResultWords(returnType)
                    const payloadWords = typeResultWords(payloadType)

                    const resultWords = pipe(
                      origin.resultWords,
                      Array.appendAll(containerWords),
                      Array.appendAll(payloadWords),
                      Array.dedupe
                    )

                    return new ProjectionOrigin({
                      path: origin.path,
                      head: origin.head,
                      resultWords,
                      valueType: payloadType
                    })
                  })
                )

              const argumentOrigin = (argument: ts.Expression) => {
                const direct = analyze(argument)
                const callback = Option.liftPredicate(isFunctionInitializer)(argument)

                const candidate = pipe(
                  callback,
                  Option.match({
                    onNone: Function.constant(direct),
                    onSome: (callbackDefinition) => {
                      const callbackSymbols = symbolsFor(callbackDefinition)
                      const combinedBindings = Array.appendAll(currentBindings, callbackSymbols)
                      const analyzeCallback = projectionOrigin(combinedBindings)(visitedSymbols)
                      const returned = singleResultExpression(callbackDefinition)

                      return pipe(returned, Option.flatMap(analyzeCallback))
                    }
                  })
                )

                return pipe(
                  candidate,
                  Option.flatMap(makeCarriedOrigin),
                  Result.fromOption(Function.constVoid)
                )
              }

              const callbacks = Array.filter(call.arguments, isFunctionInitializer)
              const hasCallbacks = Array.isReadonlyArrayNonEmpty(callbacks)
              const hasSingleArgument = strictEqual(call.arguments.length, 1)
              const rootCallee = unwrapCallee(call.expression)
              const callee = unwrapCarrier(rootCallee)
              const identifierText = (identifier: ts.Identifier) => Option.some(identifier.text)

              const propertyAccessNameText = (access: ts.PropertyAccessExpression) =>
                Option.some(access.name.text)

              const nameIsDirectCarrier = (name: string) => HashSet.has(directCarrierNames, name)

              const calleeName = pipe(
                Match.value(callee),
                Match.when(ts.isIdentifier, identifierText),
                Match.when(ts.isPropertyAccessExpression, propertyAccessNameText),
                Match.orElse(Function.constant(noneString))
              )

              const passesThroughDirectArgument = Option.exists(calleeName, nameIsDirectCarrier)

              const directArgumentChecks = Array.make(
                hasSingleArgument,
                passesThroughDirectArgument
              )

              const acceptsDirectArgument = Array.every(directArgumentChecks, Boolean)
              const directArguments = acceptsDirectArgument ? call.arguments : emptyExpressions
              const candidateArguments = hasCallbacks ? callbacks : directArguments
              const origins = Array.filterMap(candidateArguments, argumentOrigin)
              const originPath = (origin: ProjectionOrigin) => Array.join(origin.path, "\u0000")

              const sameOriginPath = (self: ProjectionOrigin, that: ProjectionOrigin) => {
                const selfPath = originPath(self)
                const thatPath = originPath(that)

                return strictEqual(selfPath, thatPath)
              }

              const uniqueOrigins = Array.dedupeWith(origins, sameOriginPath)
              const allCandidatesTraced = strictEqual(origins.length, candidateArguments.length)

              const hasSingleOrigin = (candidates: ReadonlyArray<ProjectionOrigin>) =>
                strictEqual(candidates.length, 1)

              return pipe(
                uniqueOrigins,
                Option.liftPredicate(hasSingleOrigin),
                Option.filter(Function.constant(allCandidatesTraced)),
                Option.flatMap(Array.head)
              )
            })
          )
        }

        const thisOrigin = (node: ts.ThisExpression) => {
          const valueType = checker.getTypeAtLocation(node)

          const origin = new ProjectionOrigin({
            path: emptyStrings,
            head: noneString,
            resultWords: emptyStrings,
            valueType
          })

          return Option.some(origin)
        }

        const analyzeAwaitExpression = (node: ts.AwaitExpression) => analyze(node.expression)

        const analyzeYieldExpression = (node: ts.YieldExpression) =>
          pipe(Option.fromNullishOr(node.expression), Option.flatMap(analyze))

        return pipe(
          Match.value(current),
          Match.when(ts.isAwaitExpression, analyzeAwaitExpression),
          Match.when(ts.isYieldExpression, analyzeYieldExpression),
          Match.when(ts.isIdentifier, identifierOrigin),
          Match.when(isThisExpression, thisOrigin),
          Match.when(ts.isPropertyAccessExpression, accessOrigin),
          Match.when(ts.isElementAccessExpression, elementOrigin),
          Match.when(ts.isCallExpression, callOrigin),
          Match.orElse(constantNoneProjectionOrigin)
        )
      }

    const expressions = resultExpressions(terminal)

    const expressionProjectionOrigin = (expression: ts.Expression) =>
      pipe(
        projectionOrigin(bindings)(emptySymbols)(expression),
        Result.fromOption(Function.constVoid)
      )

    const origins = pipe(expressions, Array.filterMap(expressionProjectionOrigin))
    const originPath = (origin: ProjectionOrigin) => Array.join(origin.path, "\u0000")
    const allResultsTraced = strictEqual(origins.length, expressions.length)

    const sameOriginPath = (self: ProjectionOrigin, that: ProjectionOrigin) => {
      const selfPath = originPath(self)
      const thatPath = originPath(that)

      return strictEqual(selfPath, thatPath)
    }

    const unique = Array.dedupeWith(origins, sameOriginPath)
    const originHasPath = (origin: ProjectionOrigin) => origin.path.length > 0

    const projectionEvidenceFromOrigin = (origin: ProjectionOrigin) =>
      pipe(
        origin.head,
        Option.map(
          () =>
            new ProjectionEvidence({
              path: origin.path,
              resultWords: origin.resultWords
            })
        )
      )

    const hasSingleOrigin = (origins: ReadonlyArray<ProjectionOrigin>) =>
      strictEqual(origins.length, 1)

    return pipe(
      unique,
      Option.liftPredicate(hasSingleOrigin),
      Option.filter(Function.constant(allResultsTraced)),
      Option.flatMap(Array.head),
      Option.filter(originHasPath),
      Option.flatMap(projectionEvidenceFromOrigin)
    )
  }

const sourceWordsFromParameters =
  (checker: ts.TypeChecker) =>
  (parameters: ts.NodeArray<ts.ParameterDeclaration>): ReadonlyArray<string> =>
    pipe(
      parameters,
      Array.flatMap((parameter) => {
        const nameWords = ts.isIdentifier(parameter.name)
          ? identifierWords(parameter.name.text)
          : emptyStrings

        const parameterType = checker.getTypeAtLocation(parameter)
        const typeWords = typeResultWords(parameterType)

        const propertyWords = pipe(
          parameterType.getProperties(),
          Array.flatMap(symbolIdentifierWords)
        )

        return pipe(nameWords, Array.appendAll(typeWords), Array.appendAll(propertyWords))
      }),
      Array.dedupe
    )

const sourceWords = (checker: ts.TypeChecker) =>
  Function.flow(
    terminalDefinition,
    Struct.get<FunctionDefinition, "parameters">("parameters"),
    sourceWordsFromParameters(checker)
  )

const identifierWordsFromText = (identifier: ts.Identifier) => identifierWords(identifier.text)

const propertyAccessNameWords = (access: ts.PropertyAccessExpression) =>
  identifierWords(access.name.text)

const directCalleeWords = (callee: ts.Expression) =>
  pipe(
    Match.value(callee),
    Match.when(ts.isIdentifier, identifierWordsFromText),
    Match.when(ts.isPropertyAccessExpression, propertyAccessNameWords),
    Match.orElse(constantEmptyStrings)
  )

const calleeWords = Function.compose(unwrapCarrier, directCalleeWords)

const callExpressionWords = (call: ts.CallExpression) => calleeWords(call.expression)

const newExpressionWords = (current: ts.NewExpression) => calleeWords(current.expression)

const appendExpressionOperationWords = (
  words: ReadonlyArray<string>,
  node: ts.Node
): ReadonlyArray<string> => {
  const callWords = pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.map(callExpressionWords),
    Option.getOrElse(constantEmptyStrings)
  )

  const newWords = pipe(
    Option.liftPredicate(ts.isNewExpression)(node),
    Option.map(newExpressionWords),
    Option.getOrElse(constantEmptyStrings)
  )

  const propertyWords = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(node),
    Option.map(propertyAccessNameWords),
    Option.getOrElse(constantEmptyStrings)
  )

  return pipe(
    words,
    Array.appendAll(callWords),
    Array.appendAll(newWords),
    Array.appendAll(propertyWords)
  )
}

const foldExpressionOperationWords = foldAst(appendExpressionOperationWords)

const expressionOperationWords = Function.flip(foldExpressionOperationWords)(emptyStrings)

const returnedOperationWords = (definition: FunctionDefinition): ReadonlyArray<string> =>
  pipe(resultExpressions(definition), Array.flatMap(expressionOperationWords), Array.dedupe)

const expressionRootOperationWords = (expression: ts.Expression): ReadonlyArray<string> =>
  pipe(
    unwrapCarrier(expression),
    Option.liftPredicate(ts.isCallExpression),
    Option.map(callExpressionWords),
    Option.getOrElse(constantEmptyStrings)
  )

const isConstructionOperationWord = (word: string) => HashSet.has(constructionOperations, word)

const expressionIsConstruction = (expression: ts.Expression) => {
  const current = unwrapCarrier(expression)
  const newExpression = ts.isNewExpression(current)
  const objectLiteral = ts.isObjectLiteralExpression(current)
  const directChecks = Array.make(newExpression, objectLiteral)
  const direct = Array.some(directChecks, Boolean)
  const call = Option.liftPredicate(ts.isCallExpression)(current)

  const callWords = pipe(
    call,
    Option.map(callExpressionWords),
    Option.getOrElse(constantEmptyStrings)
  )

  const constructionCall = pipe(callWords, Array.head, Option.exists(isConstructionOperationWord))

  return direct || constructionCall
}

const makeSemanticRoleEntry = (role: SemanticRole, present: boolean) => Tuple.make(role, present)

const semanticRoles =
  (result: CallableResultSemantics) =>
  (projection: Option.Option<ProjectionEvidence>) =>
  (expressions: ReadonlyArray<ts.Expression>) =>
  (operations: ReadonlyArray<string>): HashSet.HashSet<SemanticRole> => {
    const rootOperations = pipe(expressions, Array.flatMap(expressionRootOperationWords))
    const hasExpressions = Array.isReadonlyArrayNonEmpty(expressions)
    const expressionsConstructValues = Array.every(expressions, expressionIsConstruction)
    const constructedFlags = Array.make(hasExpressions, expressionsConstructValues)
    const allConstructed = Array.every(constructedFlags, Boolean)
    const projected = Option.isSome(projection)
    const lookup = hasWord(rootOperations)(lookupOperations)
    const conversion = hasWord(rootOperations)(conversionOperations)
    const aggregation = hasWord(rootOperations)(aggregationOperations)
    const hasCommandOperation = hasWord(operations)(commandOperations)
    const isEffectExecution = strictEqual(result.execution, "effect")
    const effectfulCommandFlags = Array.make(isEffectExecution, hasCommandOperation)
    const effectfulCommand = Array.every(effectfulCommandFlags, Boolean)
    const isVoidShape = strictEqual(result.shape, "void")
    const commandFlags = Array.make(isVoidShape, effectfulCommand)
    const command = Array.some(commandFlags, Boolean)
    const constructionEntry = makeSemanticRoleEntry("construction", allConstructed)
    const projectionEntry = makeSemanticRoleEntry("projection", projected)
    const lookupEntry = makeSemanticRoleEntry("lookup", lookup)
    const conversionEntry = makeSemanticRoleEntry("conversion", conversion)
    const aggregationEntry = makeSemanticRoleEntry("aggregation", aggregation)
    const commandEntry = makeSemanticRoleEntry("command", command)

    const entries = Array.make(
      constructionEntry,
      projectionEntry,
      lookupEntry,
      conversionEntry,
      aggregationEntry,
      commandEntry
    )

    return pipe(
      entries,
      Array.filterMap(([role, present]) =>
        pipe(
          Option.liftPredicate((value: boolean) => value)(present),
          Option.as(role),
          Result.fromOption(Function.constVoid)
        )
      ),
      HashSet.fromIterable
    )
  }

const buildCallableSemantics = (checker: ts.TypeChecker) => (definition: FunctionDefinition) =>
  Option.gen(function* () {
    const nameNode = yield* functionName(definition)
    const terminal = terminalDefinition(definition)
    const result = yield* callableResult(checker)(terminal)
    const name = makeCallableNameClaims(nameNode)
    const projection = projectionEvidence(checker)(definition)
    const expressions = resultExpressions(terminal)
    const operations = returnedOperationWords(terminal)
    const roles = semanticRoles(result)(projection)(expressions)(operations)

    const projectionWords = pipe(
      projection,
      Option.map(Struct.get("resultWords")),
      Option.getOrElse(constantEmptyStrings)
    )

    const resultWords = pipe(result.words, Array.appendAll(projectionWords), Array.dedupe)
    const enrichedResult = new CallableResultSemantics({ ...result, words: resultWords })
    const definitionSourceWords = sourceWords(checker)(definition)
    return new CallableSemantics({
      definition,
      node: nameNode,
      name,
      result: enrichedResult,
      sourceWords: definitionSourceWords,
      operationWords: operations,
      projection,
      roles
    })
  })

// CallableSemanticsCache retains one Program because workspace projects are analyzed sequentially.
class CallableSemanticsCache extends Data.Class<{
  readonly program: ts.Program
  readonly entries: HashMap.HashMap<string, Option.Option<CallableSemantics>>
}> {}

const emptySemanticsCache = Option.none<CallableSemanticsCache>()

// One last-program cache is enough because workspace analysis is sequential.
const semanticsCache = MutableRef.make(emptySemanticsCache)

const definitionKey = (definition: FunctionDefinition) => {
  const sourceFile = definition.getSourceFile()
  return `${sourceFile.fileName}\u0000${definition.pos}\u0000${definition.end}`
}

export const callableSemantics =
  (context: CheckContext) =>
  (definition: FunctionDefinition): Option.Option<CallableSemantics> => {
    const cached = pipe(
      MutableRef.get(semanticsCache),
      Option.filter((entry) => {
        const isSameProgram = strictEqual(entry.program, context.program)

        return isSameProgram
      })
    )

    const entries = pipe(
      cached,
      Option.map(Struct.get("entries")),
      Option.getOrElse(() => HashMap.empty<string, Option.Option<CallableSemantics>>())
    )

    const key = definitionKey(definition)
    const existing = HashMap.get(entries, key)

    if (Option.isSome(existing)) {
      return existing.value
    }

    const semantics = buildCallableSemantics(context.checker)(definition)
    const updatedEntries = HashMap.set(entries, key, semantics)

    const updatedCache = new CallableSemanticsCache({
      program: context.program,
      entries: updatedEntries
    })

    const updatedCacheOption = Option.some(updatedCache)
    MutableRef.set(semanticsCache, updatedCacheOption)

    return semantics
  }

export const isNonBooleanResult = (semantics: CallableSemantics) =>
  semantics.result.shape !== "boolean"
