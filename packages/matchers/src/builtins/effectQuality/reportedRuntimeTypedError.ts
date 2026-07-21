import { Array, Function, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import { callExpressionOf, unwrapTransparentExpression } from "../../support/tsNode.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import type { EffectQualityIndex } from "./index.js"
import { makeRuleFinding } from "./makeFindings.js"
import {
  callArgumentAt,
  effectApiCall,
  effectApiReference,
  isExpressionReferenceNode,
  isFunctionLikeExpression,
  isPipeCall,
  typeSymbolName
} from "./reportedRuntimeSupport.js"
import { strictEqual } from "@better-typescript/matchers/equivalence"

const catchCauseNames = Array.of("catchCause")

const typedErrorRecoveryFinding = makeRuleFinding("typed-error-recovery")

const effectErrorChannel =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): Option.Option<ts.Type> => {
    const type = checker.getTypeAtLocation(expression)

    const fromReference = (candidate: ts.Type): Option.Option<ts.Type> => {
      const symbolName = typeSymbolName(candidate)
      const isEffectName = strictEqual("Effect")(symbolName)
      const isStreamName = strictEqual("Stream")(symbolName)
      const isEffectFamily = isEffectName || isStreamName
      const reference = candidate as ts.TypeReference
      const isObject = (candidate.flags & ts.TypeFlags.Object) !== 0
      const objectFlags = reference.objectFlags ?? 0
      const isTypeReferenceFlag = (objectFlags & ts.ObjectFlags.Reference) !== 0
      const isInterfaceFlag = (objectFlags & ts.ObjectFlags.Interface) !== 0
      const referenceShapeFlags = Array.make(isTypeReferenceFlag, isInterfaceFlag)
      const isReferenceShape = Array.some(referenceShapeFlags, Boolean)
      const typeReferenceFlags = Array.make(isObject, isReferenceShape)
      const isTypeReference = Array.every(typeReferenceFlags, Boolean)
      const isEffectReference = Array.make(isEffectFamily, isTypeReference)

      if (Array.every(isEffectReference, Boolean)) {
        const typeArguments = checker.getTypeArguments(reference)

        return Array.get(typeArguments, 1)
      }

      if (candidate.isUnion()) {
        return pipe(
          candidate.types,
          Array.map(fromReference),
          Array.findFirst(Option.isSome),
          Option.flatten
        )
      }

      const rendered = checker.typeToString(candidate)
      const effectMatch = rendered.match(/(?:Effect|Stream)<\s*[^,>]+,\s*([^,>]+)/)

      return pipe(
        Option.fromNullishOr(effectMatch),
        Option.flatMap(Array.get(1)),
        Option.filter((text) => text.trim() !== "never"),
        Option.map(Function.constant(candidate))
      )
    }

    return fromReference(type)
  }

const typeIsNever = (type: ts.Type) => (type.flags & ts.TypeFlags.Never) !== 0

const typeIsNonNever = flow(typeIsNever, strictEqual(false))

const typeIsNonNeverError = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const isNever = typeIsNever(type)
  const isNonNever = strictEqual(false)(isNever)

  if (type.isUnion()) {
    const nonNever = Array.filter(type.types, typeIsNonNever)

    return nonNever.length > 0
  }

  const rendered = checker.typeToString(type).trim()
  const renderedNonNever = rendered !== "never"
  const flags = Array.make(isNonNever, renderedNonNever)

  return Array.every(flags, Boolean)
}

const accessNameIsPipe = (access: ts.PropertyAccessExpression) =>
  strictEqual("pipe")(access.name.text)

const catchCauseSelfExpression =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.Expression> => {
    const callee = unwrapTransparentExpression(call.expression)

    const methodPipeSelf = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
      Option.filter(accessNameIsPipe),
      Option.map(Struct.get("expression"))
    )

    if (Option.isSome(methodPipeSelf)) {
      return methodPipeSelf
    }

    if (isPipeCall(checker)(call)) {
      return callArgumentAt(0)(call)
    }

    const dataFirst = callArgumentAt(0)(call)

    const looksLikeHandler = pipe(
      dataFirst,
      Option.exists(flow(unwrapTransparentExpression, isFunctionLikeExpression))
    )

    return looksLikeHandler ? Option.none() : dataFirst
  }

const isCatchCauseCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const matches = effectApiCall(checker)
  const effectCatch = matches("Effect")(catchCauseNames)(call)
  const streamCatch = matches("Stream")(catchCauseNames)(call)

  return effectCatch || streamCatch
}

const isCatchCauseReference = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const matches = effectApiReference(checker)
  const effectCatch = matches("Effect")(catchCauseNames)(expression)
  const streamCatch = matches("Stream")(catchCauseNames)(expression)

  return effectCatch || streamCatch
}

const pipeCallSelfExpression = (call: ts.CallExpression): Option.Option<ts.Expression> => {
  const callee = unwrapTransparentExpression(call.expression)

  return ts.isPropertyAccessExpression(callee)
    ? Option.some(callee.expression)
    : callArgumentAt(0)(call)
}

const typedErrorFromSelf =
  (checker: ts.TypeChecker) =>
  (self: ts.Expression): Option.Option<ts.Type> =>
    pipe(effectErrorChannel(checker)(self), Option.filter(typeIsNonNeverError(checker)))

const callIsMethodOrFunctionPipe =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): boolean => {
    const methodPipe = ts.isPropertyAccessExpression(call.expression)
    const functionPipe = isPipeCall(checker)(call)
    const flags = Array.make(methodPipe, functionPipe)

    return Array.some(flags, Boolean)
  }

const parentIsMethodOrFunctionPipe =
  (checker: ts.TypeChecker) =>
  (parent: ts.CallExpression): boolean => {
    const parentCallee = unwrapTransparentExpression(parent.expression)

    const isMethodPipe = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(parentCallee),
      Option.exists(accessNameIsPipe)
    )

    const functionPipe = isPipeCall(checker)(parent)
    const flags = Array.make(isMethodPipe, functionPipe)

    return Array.some(flags, Boolean)
  }

const directCatchCauseFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    catchCauseSelfExpression(checker)(call),
    Option.flatMap(typedErrorFromSelf(checker)),
    Option.map(() => typedErrorRecoveryFinding("catchCause")(call))
  )

const pipeCallTypedErrorFinding =
  (checker: ts.TypeChecker) => (subject: ts.Node) => (call: ts.CallExpression) =>
    pipe(
      pipeCallSelfExpression(call),
      Option.flatMap(typedErrorFromSelf(checker)),
      Option.map(() => typedErrorRecoveryFinding("catchCause")(subject))
    )

const pipeStageCatchCauseFinding = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    Option.fromNullishOr(expression.parent),
    Option.filter(ts.isCallExpression),
    Option.filter(callIsMethodOrFunctionPipe(checker)),
    Option.flatMap(pipeCallTypedErrorFinding(checker)(expression))
  )

const dataLastCatchCauseFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    Option.fromNullishOr(call.parent),
    Option.filter(ts.isCallExpression),
    Option.filter(parentIsMethodOrFunctionPipe(checker)),
    Option.flatMap(pipeCallTypedErrorFinding(checker)(call))
  )

export const typedErrorRecoveryFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const checker = context.checker
  const catchCall = pipe(callExpressionOf(node), Option.filter(isCatchCauseCall(checker)))
  const fromDirect = pipe(catchCall, Option.flatMap(directCatchCauseFinding(checker)))

  const fromPipeStage = pipe(
    Option.liftPredicate(isExpressionReferenceNode)(node),
    Option.filter(isCatchCauseReference(checker)),
    Option.flatMap(pipeStageCatchCauseFinding(checker))
  )

  // Data-last catchCause stages need the outer pipe receiver because the call is the stage itself.
  const fromDataLastStage = pipe(
    callExpressionOf(node),
    Option.filter(isCatchCauseCall(checker)),
    Option.flatMap(dataLastCatchCauseFinding(checker))
  )

  const findings = Array.make(fromDirect, fromPipeStage, fromDataLastStage)

  return pipe(
    findings,
    Array.flatMap(Option.toArray),
    Array.dedupeWith((left, right) => {
      const sameNode = strictEqual(right.node)(left.node)
      const sameKind = strictEqual(right.kind)(left.kind)
      const flags = Array.make(sameNode, sameKind)

      return Array.every(flags, Boolean)
    })
  )
}
