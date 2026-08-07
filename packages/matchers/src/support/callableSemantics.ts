import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import type { ProgramContext } from "../sources/data.js"
import { foldAst } from "../sources/foldAst.js"
import { callableDefinitions } from "./callableDefinitions.js"
import { CallableNameClaims } from "./callableNameClaims.js"
import { CallableResultSemantics } from "./callableResultSemantics.js"
import { CallableSemantics } from "./callableSemanticsClass.js"
import { CallableSemanticsCache } from "./callableSemanticsCache.js"
import { calleeWords } from "./calleeWords.js"
import { callExpressionWords } from "./callExpressionWords.js"
import { carrierPayload } from "./carrierPayload.js"
import { carrierWords } from "./carrierWords.js"
import { noneString } from "./noneString.js"
import { constantEmptyStrings } from "./constantEmptyStrings.js"
import { declarationListIsConst } from "./declarationListIsConst.js"
import { emptyExpressions } from "./emptyExpressions.js"
import { emptyStrings } from "./emptyStrings.js"
import { resultExpressions } from "./enclosingFunctionLike.js"
import type { FunctionDefinition } from "./functionDefinition.js"
import { hasWord } from "./hasWord.js"
import { identifierName } from "./identifierName.js"
import { isFunctionInitializer } from "./isFunctionInitializer.js"
import { isNamedCarrierType } from "./isNamedCarrierType.js"
import { isObjectType } from "./isObjectType.js"
import { keyedWords } from "./keyedWords.js"
import { identifierWords } from "./matchIdentifierWords.js"
import { modifierWords } from "./modifierWords.js"
import { nestedTypes } from "./nestedTypes.js"
import { noneType } from "./noneType.js"
import { nullishFlags } from "./nullishFlags.js"
import { ProjectionEvidence } from "./projectionEvidence.js"
import { ProjectionOrigin } from "./projectionOrigin.js"
import { propertyAccessNameWords } from "./propertyAccessNameWords.js"
import { relationWords } from "./relationWords.js"
import type { ResultCardinality } from "./resultCardinality.js"
import type { ResultExecution } from "./resultExecution.js"
import type { ResultShape } from "./resultShape.js"
import type { ResultTotality } from "./resultTotality.js"
import type { SemanticRole } from "./semanticRole.js"
import { singleResultExpression } from "./singleResultExpression.js"
import { symbolDeclarations } from "./symbolDeclarations.js"
import { symbolIdentifierWords } from "./symbolIdentifierWords.js"
import { terminalDefinition } from "./terminalDefinition.js"
import { typeLayerWords } from "./typeLayerWords.js"
import { typeResultWords } from "./typeResultWords.js"
import { unwrapCallee } from "./unwrapCallee.js"
import { unwrapCarrier } from "./unwrapCarrier.js"
import { variableDeclarationInitializer } from "./variableDeclarationInitializer.js"
import {
  Array,
  Function,
  HashMap,
  HashSet,
  MutableRef,
  Option,
  Result,
  Struct,
  Tuple,
  flow,
  pipe,
  Match as EffectMatch
} from "effect"

const emptySymbols: ReadonlyArray<ts.Symbol> = Array.empty()

const noneIdentifier = Option.none<ts.Identifier>()

const noneProjectionOrigin = Option.none<ProjectionOrigin>()

const constantNoneIdentifier = Function.constant(noneIdentifier)

const constantNoneProjectionOrigin = Function.constant(noneProjectionOrigin)

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

const literalText = Struct.get<ts.StringLiteralLike, "text">("text")

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
  const relationIsToWord = strictEqual("to")
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

// NamedOwnerDeclaration is shared because owner lookup reads one declaration name field.
type NamedOwnerDeclaration = ts.VariableDeclaration | ts.PropertyAssignment | ts.PropertyDeclaration

const namedDeclarationIdentifier = (declaration: NamedOwnerDeclaration) =>
  identifierName(declaration.name)

const ownerName = (definition: FunctionDefinition) =>
  pipe(
    EffectMatch.value(definition.parent),
    EffectMatch.when(ts.isVariableDeclaration, namedDeclarationIdentifier),
    EffectMatch.when(ts.isPropertyAssignment, namedDeclarationIdentifier),
    EffectMatch.when(ts.isPropertyDeclaration, namedDeclarationIdentifier),
    EffectMatch.orElse(constantNoneIdentifier)
  )

const functionName = (definition: FunctionDefinition) => {
  const directName = pipe(Option.fromNullishOr(definition.name), Option.flatMap(identifierName))
  const enclosingName = ownerName(definition)

  return pipe(directName, Option.orElse(Function.constant(enclosingName)))
}

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

const objectTypeIsTuple = (candidate: ts.ObjectType) =>
  pipe(candidate.objectFlags & ts.ObjectFlags.Tuple, Boolean)

const isTupleType = (type: ts.Type) =>
  pipe(Option.liftPredicate(isObjectType)(type), Option.exists(objectTypeIsTuple))

const typeContainsNullish = (type: ts.Type) => {
  const ownNullish = (type.flags & nullishFlags) !== 0
  const nestedNullish = type.isUnion() && Array.some(type.types, typeContainsNullish)
  const checks = Array.make(ownNullish, nestedNullish)

  return Array.some(checks, Boolean)
}

const payloadType =
  (checker: ts.TypeChecker) =>
  (returnType: ts.Type): ts.Type => {
    const payload = carrierPayload(checker)

    const visit = (current: ts.Type, remainingDepth: number): ts.Type => {
      const next = payload(current)
      const nextType = pipe(next, Option.getOrElse(Function.constant(current)))
      const unchanged = strictEqual(current)(nextType)
      const depthExhausted = strictEqual(0)(remainingDepth)
      const completionFlags = Array.make(depthExhausted, unchanged)
      const complete = Array.some(completionFlags, Boolean)

      return complete ? current : visit(nextType, remainingDepth - 1)
    }

    return visit(returnType, 4)
  }

const resultShape =
  (checker: ts.TypeChecker) =>
  (returnType: ts.Type) =>
  (payload: ts.Type): ResultShape => {
    const returnWords = typeLayerWords(checker)(returnType)
    const isVoid = (payload.flags & (ts.TypeFlags.Void | ts.TypeFlags.Undefined)) !== 0
    const isBoolean = (payload.flags & ts.TypeFlags.BooleanLike) !== 0
    const isNumber = (payload.flags & ts.TypeFlags.NumberLike) !== 0
    const isString = (payload.flags & ts.TypeFlags.StringLike) !== 0
    const isCallable = payload.getCallSignatures().length > 0
    const isKeyed = hasWord(returnWords)(keyedWords)
    const isCollection = hasWord(returnWords)(collectionWords)
    const isObject = (payload.flags & ts.TypeFlags.Object) !== 0

    return pipe(
      EffectMatch.value(true),
      EffectMatch.when(Function.constant(isVoid), Function.constant<ResultShape>("void")),
      EffectMatch.when(Function.constant(isBoolean), Function.constant<ResultShape>("boolean")),
      EffectMatch.when(Function.constant(isNumber), Function.constant<ResultShape>("number")),
      EffectMatch.when(Function.constant(isString), Function.constant<ResultShape>("string")),
      EffectMatch.when(Function.constant(isCallable), Function.constant<ResultShape>("callable")),
      EffectMatch.when(Function.constant(isKeyed), Function.constant<ResultShape>("keyed")),
      EffectMatch.when(
        Function.constant(isCollection),
        Function.constant<ResultShape>("collection")
      ),
      EffectMatch.when(Function.constant(isObject), Function.constant<ResultShape>("object")),
      EffectMatch.orElse(Function.constant<ResultShape>("unknown"))
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
      EffectMatch.value(true),
      EffectMatch.when(Function.constant(optional), Function.constant<ResultTotality>("optional")),
      EffectMatch.when(Function.constant(fallible), Function.constant<ResultTotality>("fallible")),
      EffectMatch.when(Function.constant(unknown), Function.constant<ResultTotality>("unknown")),
      EffectMatch.orElse(Function.constant<ResultTotality>("total"))
    )
  }

const resultExecution =
  (checker: ts.TypeChecker) =>
  (returnType: ts.Type): ResultExecution => {
    const words = typeLayerWords(checker)(returnType)
    const effect = hasWord(words)(effectWords)
    const promise = hasWord(words)(promiseWords)

    return pipe(
      EffectMatch.value(true),
      EffectMatch.when(Function.constant(effect), Function.constant<ResultExecution>("effect")),
      EffectMatch.when(Function.constant(promise), Function.constant<ResultExecution>("promise")),
      EffectMatch.orElse(Function.constant<ResultExecution>("pure"))
    )
  }

const resultCardinality =
  (shape: ResultShape) =>
  (totality: ResultTotality): ResultCardinality => {
    const keyed = strictEqual("keyed")(shape)
    const many = strictEqual("collection")(shape)
    const optional = strictEqual("optional")(totality)
    const unknown = strictEqual("unknown")(shape)

    return pipe(
      EffectMatch.value(true),
      EffectMatch.when(Function.constant(keyed), Function.constant<ResultCardinality>("keyed")),
      EffectMatch.when(Function.constant(many), Function.constant<ResultCardinality>("many")),
      EffectMatch.when(
        Function.constant(optional),
        Function.constant<ResultCardinality>("optional-one")
      ),
      EffectMatch.when(Function.constant(unknown), Function.constant<ResultCardinality>("unknown")),
      EffectMatch.orElse(Function.constant<ResultCardinality>("one"))
    )
  }

const terminalCallableReturnType =
  (checker: ts.TypeChecker) =>
  (root: ts.Type): ts.Type => {
    const visit = (remainingDepth: number, current: ts.Type): ts.Type => {
      const hasSingleSignature = flow(
        Struct.get<ReadonlyArray<ts.Signature>, "length">("length"),
        strictEqual(1)
      )

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

const isNonRelationWord = (word: string) => !HashSet.has(relationWords, word)

const resultHead = (text: string) =>
  pipe(identifierWords(text), Array.takeWhile(isNonRelationWord), Array.last)

const resultHeadsFor =
  (projectionHead: string) =>
  (valueType: ts.Type): ReadonlyArray<string> =>
    pipe(typeResultWords(valueType), Array.prepend(projectionHead), Array.dedupe)

const supportsPayloadComparison = (type: ts.Type) =>
  strictEqual(0)(type.flags & unsupportedPayloadFlags)

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
        const atLimit = strictEqual(0)(remainingDepth)
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
  strictEqual(ts.SyntaxKind.ThisKeyword)(node.kind)

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
            const bindingIsCandidate = strictEqual(candidate)

            return Array.some(currentBindings, bindingIsCandidate)
          }

          const isUnvisitedSymbol = (candidate: ts.Symbol) => {
            const visitedIsCandidate = strictEqual(candidate)

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
              const hasSingleArgument = strictEqual(1)(call.arguments.length)
              const rootCallee = unwrapCallee(call.expression)
              const callee = unwrapCarrier(rootCallee)
              const identifierText = (identifier: ts.Identifier) => Option.some(identifier.text)

              const propertyAccessNameText = (access: ts.PropertyAccessExpression) =>
                Option.some(access.name.text)

              const nameIsDirectCarrier = (name: string) => HashSet.has(directCarrierNames, name)

              const calleeName = pipe(
                EffectMatch.value(callee),
                EffectMatch.when(ts.isIdentifier, identifierText),
                EffectMatch.when(ts.isPropertyAccessExpression, propertyAccessNameText),
                EffectMatch.orElse(Function.constant(noneString))
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

                return strictEqual(thatPath)(selfPath)
              }

              const uniqueOrigins = Array.dedupeWith(origins, sameOriginPath)
              const allCandidatesTraced = strictEqual(candidateArguments.length)(origins.length)

              const hasSingleOrigin = flow(
                Struct.get<ReadonlyArray<ProjectionOrigin>, "length">("length"),
                strictEqual(1)
              )

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
          EffectMatch.value(current),
          EffectMatch.when(ts.isAwaitExpression, analyzeAwaitExpression),
          EffectMatch.when(ts.isYieldExpression, analyzeYieldExpression),
          EffectMatch.when(ts.isIdentifier, identifierOrigin),
          EffectMatch.when(isThisExpression, thisOrigin),
          EffectMatch.when(ts.isPropertyAccessExpression, accessOrigin),
          EffectMatch.when(ts.isElementAccessExpression, elementOrigin),
          EffectMatch.when(ts.isCallExpression, callOrigin),
          EffectMatch.orElse(constantNoneProjectionOrigin)
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
    const allResultsTraced = strictEqual(expressions.length)(origins.length)

    const sameOriginPath = (self: ProjectionOrigin, that: ProjectionOrigin) => {
      const selfPath = originPath(self)
      const thatPath = originPath(that)

      return strictEqual(thatPath)(selfPath)
    }

    const unique = Array.dedupeWith(origins, sameOriginPath)
    const originHasPath = (origin: ProjectionOrigin) => origin.path.length > 0

    const projectionEvidenceFromOrigin = (origin: ProjectionOrigin) =>
      pipe(
        origin.head,
        Option.map(
          () =>
            new ProjectionEvidence({
              resultWords: origin.resultWords
            })
        )
      )

    const hasSingleOrigin = flow(
      Struct.get<ReadonlyArray<ProjectionOrigin>, "length">("length"),
      strictEqual(1)
    )

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
    const isEffectExecution = strictEqual("effect")(result.execution)
    const effectfulCommandFlags = Array.make(isEffectExecution, hasCommandOperation)
    const effectfulCommand = Array.every(effectfulCommandFlags, Boolean)
    const isVoidShape = strictEqual("void")(result.shape)
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

const emptySemanticsCache = Option.none<CallableSemanticsCache>()

// One last-program cache is enough because workspace analysis is sequential.
const semanticsCache = MutableRef.make(emptySemanticsCache)

const definitionKey = (definition: FunctionDefinition) => {
  const sourceFile = definition.getSourceFile()
  return `${sourceFile.fileName}\u0000${definition.pos}\u0000${definition.end}`
}

export const callableSemantics =
  (context: ProgramContext) =>
  (definition: FunctionDefinition): Option.Option<CallableSemantics> => {
    const cached = pipe(
      MutableRef.get(semanticsCache),
      Option.filter((entry) => {
        const isSameProgram = strictEqual(context.program)(entry.program)

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
