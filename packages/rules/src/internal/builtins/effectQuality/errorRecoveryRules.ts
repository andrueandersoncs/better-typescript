import { NodeTarget } from "@better-typescript/core/linter"
import { Array, Match as EffectMatch, Function, Option, Schema, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../equivalence.js"
import { fixedRuleMessage } from "../../rule/fixedRuleMessage.js"
import { makeRule } from "../../rule/makeRule.js"
import { acceptsNode } from "../../scanner/acceptsNode.js"
import { makeNodeScanner } from "../../scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { foldAst } from "../../sources/foldAst.js"
import { callExpressionOf } from "../../support/callExpressionOf.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { apiSubject } from "./apiSubject.js"
import { callIsEffectApi } from "./callIsEffectApi.js"
import {
  callArgumentAt,
  effectApiCall,
  effectApiReference,
  isExpressionReferenceNode,
  isFunctionLikeExpression,
  isPipeCall,
  typeSymbolName
} from "./effectApiFacts.js"
import { makeSubjectMatch, noSubjectMatches } from "./subjectMatch.js"

const catchCauseNames = Array.make("catchCause", "catchAllCause")

const isNodeTarget = Schema.is(NodeTarget)

const nodeTarget = flow(Option.liftPredicate(isNodeTarget), Option.map(Struct.get("node")))

const nodePairMatches = ([left, right]: readonly [ts.Node, ts.Node]) => strictEqual(right)(left)

const matchesTargetSameNode = (left: ScannerMatch<string>, right: ScannerMatch<string>) => {
  const leftNode = nodeTarget(left.target)
  const rightNode = nodeTarget(right.target)
  const nodes = Option.product(leftNode, rightNode)

  return pipe(nodes, Option.exists(nodePairMatches))
}

const accessNameIsPipe = (access: ts.PropertyAccessExpression) =>
  strictEqual("pipe")(access.name.text)

const typeIsNever = (type: ts.Type) => (type.flags & ts.TypeFlags.Never) !== 0

const effectErrorChannel =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): Option.Option<ts.Type> => {
    const type = checker.getTypeAtLocation(expression)

    const fromReference = (candidate: ts.Type): Option.Option<ts.Type> => {
      const symbolName = typeSymbolName(candidate)
      const isEffectName = strictEqual("Effect")(symbolName)
      const isStreamName = strictEqual("Stream")(symbolName)
      const isEffectFamily = isEffectName || isStreamName
      const isObject = (candidate.flags & ts.TypeFlags.Object) !== 0
      const objectFlags = (candidate as ts.TypeReference).objectFlags ?? 0
      const isTypeReferenceFlag = (objectFlags & ts.ObjectFlags.Reference) !== 0
      const isInterfaceFlag = (objectFlags & ts.ObjectFlags.Interface) !== 0
      const referenceShapeFlags = Array.make(isTypeReferenceFlag, isInterfaceFlag)
      const isReferenceShape = Array.some(referenceShapeFlags, Boolean)
      const typeReferenceFlags = Array.make(isObject, isReferenceShape)
      const isTypeReference = Array.every(typeReferenceFlags, Boolean)
      const isEffectReference = Array.make(isEffectFamily, isTypeReference)

      if (Array.every(isEffectReference, Boolean)) {
        const typeArguments = checker.getTypeArguments(candidate as ts.TypeReference)

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

const typedErrorFromSelf =
  (checker: ts.TypeChecker) =>
  (self: ts.Expression): Option.Option<ts.Type> =>
    pipe(effectErrorChannel(checker)(self), Option.filter(typeIsNonNeverError(checker)))

const pipeCallSelfExpression = (call: ts.CallExpression): Option.Option<ts.Expression> => {
  const callee = unwrapTransparentExpression(call.expression)

  return ts.isPropertyAccessExpression(callee)
    ? Option.some(callee.expression)
    : callArgumentAt(0)(call)
}

const pipeCallTypedErrorFinding =
  (checker: ts.TypeChecker) => (subject: ts.Node) => (call: ts.CallExpression) =>
    pipe(
      pipeCallSelfExpression(call),
      Option.flatMap(typedErrorFromSelf(checker)),
      Option.map(() => makeSubjectMatch("catchCause")(subject))
    )

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
    Option.map(() => makeSubjectMatch("catchCause")(call))
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

const typedErrorRecoveryFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const catchCall = pipe(callExpressionOf(node), Option.filter(isCatchCauseCall(context.checker)))
    const fromDirect = pipe(catchCall, Option.flatMap(directCatchCauseFinding(context.checker)))

    const fromPipeStage = pipe(
      Option.liftPredicate(isExpressionReferenceNode)(node),
      Option.filter(isCatchCauseReference(context.checker)),
      Option.flatMap(pipeStageCatchCauseFinding(context.checker))
    )

    // Data-last catchCause stages need the outer pipe receiver because the call is the stage itself.
    const fromDataLastStage = pipe(
      callExpressionOf(node),
      Option.filter(isCatchCauseCall(context.checker)),
      Option.flatMap(dataLastCatchCauseFinding(context.checker))
    )

    const findings = Array.make(fromDirect, fromPipeStage, fromDataLastStage)

    return pipe(findings, Array.flatMap(Option.toArray), Array.dedupeWith(matchesTargetSameNode))
  }

const catchAllNames = Array.make("catchAll", "catchAllDefect")

const failNames = Array.make("fail", "failSync")

const domainErrorPattern = /Error|Fail|Fault|Defect|Tagged/i

const builtinErrorPattern = /^(Error|TypeError|RangeError)$/

const newExpressionCalleeText = (expression: ts.NewExpression) =>
  pipe(expression.expression.getText(), Option.some)

const callExpressionCalleeText = (expression: ts.CallExpression) =>
  pipe(expression.expression.getText(), Option.some)

const constructionTextOf = (current: ts.Node) =>
  pipe(
    EffectMatch.value(current),
    EffectMatch.when(ts.isNewExpression, newExpressionCalleeText),
    EffectMatch.when(ts.isCallExpression, callExpressionCalleeText),
    EffectMatch.orElse(() => Option.none())
  )

const isTaggedDomainConstruction = (text: string) => {
  const looksDomain = domainErrorPattern.test(text)
  const isBuiltin = builtinErrorPattern.test(text)
  const notBuiltin = !isBuiltin
  const checks = Array.make(looksDomain, notBuiltin)

  return Array.every(checks, Boolean)
}

const isRawErrorConstruction = (expression: ts.NewExpression) => {
  const callee = unwrapTransparentExpression(expression.expression)
  const isIdentifier = ts.isIdentifier(callee)
  const calleeText = isIdentifier ? callee.text : ""
  const isErrorName = strictEqual("Error")(calleeText)
  const checks = Array.make(isIdentifier, isErrorName)

  return Array.every(checks, Boolean)
}

const typedBoundaryErrorCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const catchAllCall = callIsEffectApi(context.checker)("Effect")(catchAllNames)(node)
    const catchCauseCall = callIsEffectApi(context.checker)("Effect")(catchCauseNames)(node)
    const catchAllParts = Array.make(catchAllCall, catchCauseCall)
    const catchAll = Array.some(catchAllParts, Boolean)

    if (!catchAll) {
      return noSubjectMatches
    }

    const handlerOption = pipe(
      Option.fromNullishOr(node.arguments[1]),
      Option.orElse(() => Option.fromNullishOr(node.arguments[0]))
    )

    if (Option.isNone(handlerOption)) {
      return noSubjectMatches
    }

    // Stay quiet when the handler already because mapping is present.
    const mapsTaggedErrorStep = (found: boolean) => (current: ts.Node) => {
      const taggedConstruction = pipe(
        constructionTextOf(current),
        Option.exists(isTaggedDomainConstruction)
      )

      const failConstruction = pipe(
        Option.liftPredicate(ts.isCallExpression)(current),
        Option.exists(callIsEffectApi(context.checker)("Effect")(failNames))
      )

      const signals = Array.make(found, taggedConstruction, failConstruction)

      return Array.some(signals, Boolean)
    }

    const uncurriedMapsTaggedErrorStep = Function.untupled(
      ([found, current]: readonly [boolean, ts.Node]) => mapsTaggedErrorStep(found)(current)
    )

    const mapsTaggedError = foldAst(uncurriedMapsTaggedErrorStep)(handlerOption.value)(false)

    // Only flag handlers that rethrow or return raw Error because that skips domain mapping.
    const returnsRawErrorStep = (found: boolean) => (current: ts.Node) => {
      const rawError = pipe(
        EffectMatch.value(current),
        EffectMatch.when(ts.isThrowStatement, Function.constTrue),
        EffectMatch.when(ts.isNewExpression, isRawErrorConstruction),
        EffectMatch.orElse(Function.constFalse)
      )

      const signals = Array.make(found, rawError)

      return Array.some(signals, Boolean)
    }

    const uncurriedReturnsRawErrorStep = Function.untupled(
      ([found, current]: readonly [boolean, ts.Node]) => returnsRawErrorStep(found)(current)
    )

    const returnsRawError = foldAst(uncurriedReturnsRawErrorStep)(handlerOption.value)(false)
    const mapsWithoutRawParts = Array.make(mapsTaggedError, !returnsRawError)
    const mapsWithoutRaw = Array.every(mapsWithoutRawParts, Boolean)
    const quiet = Array.make(mapsWithoutRaw, !returnsRawError)

    if (Array.some(quiet, Boolean)) {
      return noSubjectMatches
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeSubjectMatch(subject)(node.expression)

    return Array.of(finding)
  }

const runtimeKinds = Array.make(
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.NewExpression,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.DeleteExpression,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.ForStatement
)

const callKinds = Array.of(ts.SyntaxKind.CallExpression)

const typedErrorRecoveryScanner = makeNodeScanner(runtimeKinds)(acceptsNode)(
  typedErrorRecoveryFindings
)

export const typedErrorRecovery = makeRule("typed-error-recovery")(typedErrorRecoveryScanner)(
  fixedRuleMessage(
    "Use typed error recovery instead of broad cause recovery.",
    "Use catchIf, catchTag, catchFilter, or retry for expected typed failures."
  )
)

const typedBoundaryErrorScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  typedBoundaryErrorCandidates
)

export const typedBoundaryError = makeRule("typed-boundary-error")(typedBoundaryErrorScanner)(
  fixedRuleMessage(
    "Map boundary failures to typed domain errors.",
    "Translate infrastructure failures at the adapter seam into an operation-labelled domain error."
  )
)
