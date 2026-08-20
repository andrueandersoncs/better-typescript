import { Array, Function, Option, Struct, Tuple, flow, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { effectQualityRuntimeKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { acceptsNode } from "../../internal/scanner/acceptsNode.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../internal/scanner/match.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import {
  effectApiCall,
  isPipeCall,
  typeSymbolName
} from "../../internal/builtins/effectQuality/effectApiFacts.js"
import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"
import { callExpressionOf } from "../../internal/support/callExpressionOf.js"
import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

// LayerChannels exists because dependency detection needs paired output and input types.
interface LayerChannels {
  readonly input: ts.Type
  readonly output: ts.Type
}

const mergeNames = Array.make("merge", "mergeAll")

const uncertainTypeFlags =
  ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter | ts.TypeFlags.Never

const typeIsUncertain = (type: ts.Type): boolean => {
  const directlyUncertain = (type.flags & uncertainTypeFlags) !== 0
  const isCompound = type.isUnionOrIntersection()
  const nestedUncertain = isCompound && Array.some(type.types, typeIsUncertain)

  return directlyUncertain || nestedUncertain
}

const typeReferenceArguments = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const objectFlags = (type as ts.ObjectType).objectFlags ?? 0
  const referenceLikeFlags = ts.ObjectFlags.Reference | ts.ObjectFlags.Interface
  const isReferenceLike = (objectFlags & referenceLikeFlags) !== 0

  return isReferenceLike
    ? checker.getTypeArguments(type as ts.TypeReference)
    : Array.empty<ts.Type>()
}

const layerChannels =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): Option.Option<LayerChannels> => {
    const argumentsList = typeReferenceArguments(checker)(type)
    const output = Array.get(argumentsList, 0)
    const input = Array.get(argumentsList, 2)
    const name = typeSymbolName(type)
    const isLayer = strictEqual("Layer")(name)

    return isLayer ? Option.all({ input, output }) : Option.none()
  }

const tupleElementTypes =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): Option.Option<ReadonlyArray<ts.Type>> => {
    const argumentsList = checker.getTypeArguments(type as ts.TypeReference)

    return checker.isTupleType(type) ? Option.some(argumentsList) : Option.none()
  }

const layerOperandTypesFromType =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): ReadonlyArray<ts.Type> => {
    const tupleElements = tupleElementTypes(checker)(type)
    const layer = layerChannels(checker)(type)
    const singleton = Array.of(type)
    const singletonLayer = Option.map(layer, Function.constant(singleton))

    return pipe(
      tupleElements,
      Option.orElse(Function.constant(singletonLayer)),
      Option.getOrElse(Array.empty<ts.Type>)
    )
  }

const layerOperandTypesFromExpression =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): ReadonlyArray<ts.Type> => {
    const unwrapped = unwrapTransparentExpression(expression)

    if (ts.isSpreadElement(unwrapped)) {
      const spreadType = checker.getTypeAtLocation(unwrapped.expression)

      return layerOperandTypesFromType(checker)(spreadType)
    }

    if (ts.isArrayLiteralExpression(unwrapped)) {
      return pipe(
        unwrapped.elements,
        Array.flatMap((element) => {
          if (ts.isOmittedExpression(element)) {
            return Array.empty<ts.Type>()
          }

          if (ts.isSpreadElement(element)) {
            const spreadType = checker.getTypeAtLocation(element.expression)

            return layerOperandTypesFromType(checker)(spreadType)
          }

          return layerOperandTypesFromExpression(checker)(element)
        })
      )
    }

    const expressionType = checker.getTypeAtLocation(expression)

    return layerOperandTypesFromType(checker)(expressionType)
  }

const callChainArguments = (call: ts.CallExpression): ReadonlyArray<ts.Expression> => {
  const innerArguments = ts.isCallExpression(call.expression)
    ? callChainArguments(call.expression)
    : Array.empty<ts.Expression>()

  return Array.appendAll(innerArguments, call.arguments)
}

const parentCalls =
  (call: ts.CallExpression) =>
  (parent: ts.Node): boolean =>
    ts.isCallExpression(parent) && strictEqual(call)(parent.expression)

const callIsCalledByParent = (call: ts.CallExpression) =>
  pipe(Option.fromNullishOr(call.parent), Option.exists(parentCalls(call)))

const callSignatures = (type: ts.Type) => type.getCallSignatures()

const expressionReturnType = (checker: ts.TypeChecker) =>
  flow(
    checker.getTypeAtLocation.bind(checker),
    callSignatures,
    Array.head,
    Option.map(checker.getReturnTypeOfSignature.bind(checker))
  )

const propertyNameText = flow(
  Struct.get<ts.PropertyAccessExpression, "name">("name"),
  Struct.get("text")
)

const propertyAccessIsPipe = flow(propertyNameText, strictEqual("pipe"))

const precedingStageType =
  (checker: ts.TypeChecker) =>
  (parent: ts.CallExpression) =>
  (stagePosition: number): Option.Option<ts.Type> =>
    pipe(
      Array.get(parent.arguments, stagePosition - 1),
      Option.flatMap(expressionReturnType(checker))
    )

const pipeStageInputFromParent =
  (checker: ts.TypeChecker) =>
  (stage: ts.CallExpression) =>
  (parent: ts.CallExpression): Option.Option<ts.Type> => {
    const stagePosition = parent.arguments.findIndex(strictEqual(stage))

    if (stagePosition < 0) {
      return Option.none()
    }

    const callee = unwrapTransparentExpression(parent.expression)
    const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)
    const methodPipe = pipe(propertyAccess, Option.exists(propertyAccessIsPipe))
    const firstStage = strictEqual(0)(stagePosition)

    if (methodPipe) {
      const receiverType = pipe(
        propertyAccess,
        Option.map(flow(Struct.get("expression"), checker.getTypeAtLocation.bind(checker)))
      )

      return firstStage ? receiverType : precedingStageType(checker)(parent)(stagePosition)
    }

    const functionPipe = isPipeCall(checker)(parent)
    const invalidFunctionStage = Array.some([!functionPipe, firstStage], Boolean)

    if (invalidFunctionStage) {
      return Option.none()
    }

    const firstFunctionStage = strictEqual(1)(stagePosition)

    const initialType = pipe(
      Array.head(parent.arguments),
      Option.map(checker.getTypeAtLocation.bind(checker))
    )

    return firstFunctionStage ? initialType : precedingStageType(checker)(parent)(stagePosition)
  }

const pipeStageInputType =
  (checker: ts.TypeChecker) =>
  (stage: ts.CallExpression): Option.Option<ts.Type> =>
    pipe(
      Option.fromNullishOr(stage.parent),
      Option.filter(ts.isCallExpression),
      Option.flatMap(pipeStageInputFromParent(checker)(stage))
    )

const inputConstituents = (input: ts.Type): ReadonlyArray<ts.Type> =>
  input.isUnion() ? input.types : Array.of(input)

const typeIsCertain = flow(typeIsUncertain, strictEqual(false))

const inputIsCoveredBy = (checker: ts.TypeChecker) => (output: ts.Type) => (input: ts.Type) =>
  checker.isTypeAssignableTo(input, output)

const outputCoversInput =
  (checker: ts.TypeChecker) =>
  (provider: LayerChannels) =>
  (dependent: LayerChannels): boolean => {
    const outputIsCertain = typeIsCertain(provider.output)

    const coversInput = pipe(
      inputConstituents(dependent.input),
      Array.filter(typeIsCertain),
      Array.some(inputIsCoveredBy(checker)(provider.output))
    )

    return outputIsCertain && coversInput
  }

const dependentMatchesProvider =
  (checker: ts.TypeChecker) =>
  (provider: readonly [LayerChannels, number]) =>
  (dependent: readonly [LayerChannels, number]): boolean => {
    const providerChannels = Tuple.get(provider, 0)
    const dependentChannels = Tuple.get(dependent, 0)
    const providerPosition = Tuple.get(provider, 1)
    const dependentPosition = Tuple.get(dependent, 1)
    const positionsMatch = strictEqual(providerPosition)(dependentPosition)
    const distinct = pipe(positionsMatch, strictEqual(false))
    const covered = outputCoversInput(checker)(providerChannels)(dependentChannels)

    return distinct && covered
  }

const providerHasDependent =
  (checker: ts.TypeChecker) =>
  (operands: ReadonlyArray<readonly [LayerChannels, number]>) =>
  (provider: readonly [LayerChannels, number]): boolean =>
    Array.some(operands, dependentMatchesProvider(checker)(provider))

const operandsHaveDependency =
  (checker: ts.TypeChecker) =>
  (types: ReadonlyArray<ts.Type>): boolean => {
    const channels = pipe(types, Array.map(layerChannels(checker)), Array.flatMap(Option.toArray))
    const operands = Array.map(channels, (channel, position) => Tuple.make(channel, position))

    return Array.some(operands, providerHasDependent(checker)(operands))
  }

const mergeOperandTypes =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): ReadonlyArray<ts.Type> => {
    const argumentTypes = pipe(
      callChainArguments(call),
      Array.flatMap(layerOperandTypesFromExpression(checker))
    )

    const pipeInput = pipe(pipeStageInputType(checker)(call), Option.toArray)

    return Array.appendAll(argumentTypes, pipeInput)
  }

const isNotCalledByParent = flow(callIsCalledByParent, strictEqual(false))

const dependentLayerMergeFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const call = callExpressionOf(node)

    const effectMerge = pipe(
      call,
      Option.filter(effectApiCall(context.checker)("Layer")(mergeNames)),
      Option.filter(isNotCalledByParent),
      Option.filter(
        flow(mergeOperandTypes(context.checker), operandsHaveDependency(context.checker))
      )
    )

    return pipe(
      effectMerge,
      Option.map(makeSubjectMatch("Layer.merge")),
      Option.match({ onNone: Function.constant(noSubjectMatches), onSome: Array.of })
    )
  }

export const dependentLayerMergeScanner = makeNodeScanner(effectQualityRuntimeKinds)(acceptsNode)(
  dependentLayerMergeFindings
)
