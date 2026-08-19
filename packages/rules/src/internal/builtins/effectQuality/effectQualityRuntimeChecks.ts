import * as ts from "typescript"
import {
  Array,
  Function,
  Option,
  Struct,
  flow,
  pipe,
  Match as EffectMatch,
  HashSet,
  Match
} from "effect"
import { strictEqual } from "../../equivalence.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { foldAst } from "../../sources/foldAst.js"
import { callExpressionOf } from "../../support/callExpressionOf.js"
import { isProcessEnvironmentProductionSource } from "../../support/isProcessEnvironmentProductionSource.js"
import { binaryAssignmentTarget } from "../../support/hasAssignmentOperator.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { enclosingFunctionLike } from "../../support/effectApi/enclosingFunctionLike.js"
import { importedMemberAt } from "../../support/effectApi/importedMemberAt.js"
import type { ImportedMember } from "../../support/effectApi/importedMember.js"
import { propertyAssignmentNamed } from "../../support/effectApi/propertyAssignments.js"
import { ambientCapabilityPropertySubject } from "../../support/effectApi/ambientCapabilityPropertySubject.js"
import { EffectQualityIndex } from "./effectQualityIndex.js"
import { EffectQualityRuleCandidate } from "./effectQualityRuleCandidate.js"
import { emptyRuleCandidates } from "./emptyRuleCandidates.js"
import { isAccessExpression } from "./isAccessExpression.js"
import { makeRuleCandidate } from "./makeRuleCandidate.js"
import { isOutermostAccess } from "./isOutermostAccess.js"
import { isProcessEnvironmentAccess } from "./processEnvironmentAccess.js"
import { importedEffectApiAt } from "../../support/effectApi/importedEffectApiAt.js"
import { identifierTextIsPipe } from "./identifierTextIsPipe.js"
import { hasEffectCallAncestor } from "../../support/effectApi/hasEffectCallAncestor.js"
import { ancestorMatching } from "./ancestorMatching.js"
import { apiSubject } from "./apiSubject.js"
import { backoffScheduleNames } from "./backoffScheduleNames.js"
import { callIsEffectApi } from "./callIsEffectApi.js"
import { memberLastName } from "./memberLastName.js"
import { retryEffectNames } from "./retryEffectNames.js"
import { propertyNameText } from "../../support/propertyNameText.js"
import { EffectQualityRuleCheck } from "./effectQualityRuleCheck.js"
import type { EffectQualityRuleData } from "./effectQualityRuleData.js"

const makeEffectQualityRuntimeChecks = () => {
  const catchCauseNames = Array.make("catchCause", "catchAllCause")

  const accessNameIsPipe = (access: ts.PropertyAccessExpression) =>
    strictEqual("pipe")(access.name.text)

  const callArgumentAt = (index: number) => (call: ts.CallExpression) =>
    Option.fromNullishOr(call.arguments[index])

  const effectApiCall =
    (checker: ts.TypeChecker) => (namespace: string) => (names: ReadonlyArray<string>) => {
      const isEffectApi = importedEffectApiAt(checker)(namespace)(names)

      return flow(
        Struct.get<ts.CallExpression, "expression">("expression"),
        unwrapCallee,
        isEffectApi
      )
    }

  const hasAncestor =
    (predicate: (candidate: ts.Node) => boolean) =>
    (node: ts.Node): boolean => {
      const visit = (current: ts.Node): boolean => {
        const matches = predicate(current)
        const parent = Option.fromNullishOr(current.parent)

        return matches || Option.exists(parent, visit)
      }

      const parent = Option.fromNullishOr(node.parent)

      return Option.exists(parent, visit)
    }

  const isFunctionLikeExpression = (
    initializer: ts.Expression
  ): initializer is ts.ArrowFunction | ts.FunctionExpression => {
    const asArrow = ts.isArrowFunction(initializer)
    const asFunction = ts.isFunctionExpression(initializer)

    return asArrow || asFunction
  }

  const objectLiteralArgument = flow(
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isObjectLiteralExpression)
  )

  const lookupNames = Array.of("lookup")

  const lookupPropertyAssignment = (object: ts.ObjectLiteralExpression) =>
    pipe(propertyAssignmentNamed(lookupNames)(object), Option.filter(ts.isPropertyAssignment))

  const unwrappedPropertyInitializer = (property: ts.PropertyAssignment) =>
    unwrapTransparentExpression(property.initializer)

  const lookupExpressionFromCacheOptions = (argument: ts.Expression) => {
    const unwrapped = unwrapTransparentExpression(argument)
    const asObject = objectLiteralArgument(argument)

    const fromObject = pipe(
      asObject,
      Option.flatMap(lookupPropertyAssignment),
      Option.map(unwrappedPropertyInitializer),
      Option.filter(isFunctionLikeExpression)
    )

    const asFunction = pipe(Option.some(unwrapped), Option.filter(isFunctionLikeExpression))

    return pipe(fromObject, Option.orElse(Function.constant(asFunction)))
  }

  const cacheMakeLookupFunction =
    (checker: ts.TypeChecker) =>
    (call: ts.CallExpression): Option.Option<ts.Expression> => {
      const matchesCacheMake = effectApiCall(checker)("Cache")(cacheMakeNames)

      if (!matchesCacheMake(call)) {
        return Option.none()
      }

      const options = pipe(
        EffectMatch.value(call.arguments.length),
        EffectMatch.when(1, () => callArgumentAt(0)(call)),
        EffectMatch.when(2, () => callArgumentAt(0)(call)),
        EffectMatch.orElse(() => Option.none())
      )

      return pipe(options, Option.flatMap(lookupExpressionFromCacheOptions))
    }

  const nestedInsideCacheLookup = (checker: ts.TypeChecker) => (node: ts.Node) => {
    const visit = (current: ts.Node): boolean => {
      if (!ts.isCallExpression(current)) {
        return pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
      }

      const lookupFunction = cacheMakeLookupFunction(checker)(current)

      if (Option.isSome(lookupFunction)) {
        const isInsideLookup = hasAncestor(strictEqual(lookupFunction.value))

        return isInsideLookup(node)
      }

      return pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
    }

    return pipe(Option.fromNullishOr(node.parent), Option.exists(visit))
  }

  const effectApiReference =
    (checker: ts.TypeChecker) => (namespace: string) => (names: ReadonlyArray<string>) =>
      flow(unwrapTransparentExpression, importedEffectApiAt(checker)(namespace)(names))

  const pipeNames = Array.of("pipe")

  const isPipeCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
    const callee = unwrapCallee(call.expression)
    const fromEffect = importedEffectApiAt(checker)("Function")(pipeNames)(callee)

    const pipeIdentifier = pipe(
      Option.liftPredicate(ts.isIdentifier)(callee),
      Option.exists(identifierTextIsPipe)
    )

    const flags = Array.make(fromEffect, pipeIdentifier)

    return Array.some(flags, Boolean)
  }

  const isExpressionReferenceNode = (candidate: ts.Node): candidate is ts.Expression => {
    const asIdentifier = ts.isIdentifier(candidate)
    const asProperty = ts.isPropertyAccessExpression(candidate)

    return asIdentifier || asProperty
  }

  const stagesContainExpression =
    (expression: ts.Expression) => (stages: ReadonlyArray<ts.Expression>) =>
      Array.some(stages, strictEqual(expression))

  const pipeParentContainsStage =
    (checker: ts.TypeChecker) => (expression: ts.Expression) => (parent: ts.Node) =>
      pipe(
        Option.liftPredicate(ts.isCallExpression)(parent),
        Option.filter(isPipeCall(checker)),
        Option.map(flow(Struct.get("arguments"), Array.fromIterable)),
        Option.exists(stagesContainExpression(expression))
      )

  const expressionIsPipeStage = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
    pipe(
      Option.fromNullishOr(expression.parent),
      Option.exists(pipeParentContainsStage(checker)(expression))
    )

  const callOrPipeStageSubject =
    (checker: ts.TypeChecker) =>
    (namespace: string) =>
    (names: ReadonlyArray<string>) =>
    (node: ts.Node): Option.Option<ts.Node> => {
      const matchesCall = effectApiCall(checker)(namespace)(names)
      const matchesReference = effectApiReference(checker)(namespace)(names)

      const asCall = pipe(
        callExpressionOf(node),
        Option.filter(matchesCall),
        Option.map((call) => call as ts.Node)
      )

      const asReference = pipe(
        Option.liftPredicate(isExpressionReferenceNode)(node),
        Option.filter(matchesReference),
        Option.filter(expressionIsPipeStage(checker)),
        Option.map((expression) => expression as ts.Node)
      )

      return pipe(asCall, Option.orElse(Function.constant(asReference)))
    }

  const typeIsNever = (type: ts.Type) => (type.flags & ts.TypeFlags.Never) !== 0

  const typeSymbolName = (type: ts.Type) => {
    const rawSymbol = type.getSymbol()
    const symbol = Option.fromNullishOr(rawSymbol)
    const alias = Option.fromNullishOr(type.aliasSymbol)

    return pipe(
      symbol,
      Option.orElse(Function.constant(alias)),
      Option.map(Struct.get("name")),
      Option.getOrElse(Function.constant(""))
    )
  }

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

  const emptyTypes = Array.empty<ts.Type>()
  const identifierTextIsMap = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Map"))

  const isMapIdentifier = (expression: ts.Expression) =>
    pipe(Option.liftPredicate(ts.isIdentifier)(expression), Option.exists(identifierTextIsMap))

  const newExpressionIsMap = (expression: ts.NewExpression) =>
    isMapIdentifier(expression.expression)

  const newMapExpression = (node: ts.Node) =>
    pipe(Option.liftPredicate(ts.isNewExpression)(node), Option.filter(newExpressionIsMap))

  const layerAcquisitionNames = Array.make("effect", "effectDiscard", "effectContext")

  const typeArgsOfTypeReference = (checker: ts.TypeChecker) => (type: ts.Type) => {
    const objectFlags = (type as ts.TypeReference).objectFlags ?? 0
    const isReference = (objectFlags & ts.ObjectFlags.Reference) !== 0

    return isReference ? checker.getTypeArguments(type as ts.TypeReference) : emptyTypes
  }

  const typeMentionsConstructor =
    (checker: ts.TypeChecker) =>
    (name: string) =>
    (type: ts.Type): boolean => {
      const visit =
        (seen: ReadonlyArray<ts.Type>) =>
        (current: ts.Type): boolean => {
          const previousEqualsCurrent = strictEqual(current)
          const alreadySeen = Array.some(seen, previousEqualsCurrent)
          const notSeen = strictEqual(false)(alreadySeen)
          const nextSeen = Array.append(seen, current)
          const symbolName = typeSymbolName(current)
          const matchesName = strictEqual(name)(symbolName)
          const unionParts = current.isUnionOrIntersection() ? current.types : emptyTypes
          const visitNext = visit(nextSeen)
          const unionMentions = Array.some(unionParts, visitNext)
          const typeArguments = typeArgsOfTypeReference(checker)(current)
          const argumentMentions = Array.some(typeArguments, visitNext)
          const rendered = checker.typeToString(current)
          const renderedMentions = rendered.includes(`${name}<`)
          const nestedFlags = Array.make(unionMentions, argumentMentions, renderedMentions)
          const hasStructural = Array.some(nestedFlags, Boolean)
          const matchFlags = Array.make(matchesName, hasStructural)
          const matches = Array.some(matchFlags, Boolean)
          const resultFlags = Array.make(notSeen, matches)

          return Array.every(resultFlags, Boolean)
        }

      return visit(emptyTypes)(type)
    }

  const mapValueLooksPending = (context: MatchContext) => (expression: ts.NewExpression) => {
    const type = context.checker.getTypeAtLocation(expression)
    const mentions = typeMentionsConstructor(context.checker)
    const asPromise = mentions("Promise")(type)
    const asEffect = mentions("Effect")(type)

    return asPromise || asEffect
  }

  const typedErrorRecoveryFinding = makeRuleCandidate("typed-error-recovery")

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
        Option.map(() => typedErrorRecoveryFinding("catchCause")(subject))
      )

  const scheduleForeverNames = Array.of("forever")

  const scheduleBoundNames = Array.make(
    "recurs",
    "upTo",
    "times",
    "count",
    "while_",
    "until",
    "intersect"
  )

  const scheduleBaseNames = Array.make(
    "exponential",
    "fibonacci",
    "spaced",
    "fixed",
    "forever",
    "repeatForever",
    "fromDelay",
    "fromDelays"
  )

  const scheduleBoundMethodNames = HashSet.make(
    "compose",
    "intersect",
    "either",
    "andThen",
    "upTo",
    "while",
    "until",
    "times",
    "recurs"
  )

  const scheduleExpressionIsBounded =
    (checker: ts.TypeChecker) =>
    (expression: ts.Expression): boolean => {
      const unwrapped = unwrapTransparentExpression(expression)
      const scheduleReference = effectApiReference(checker)("Schedule")
      const isBoundName = scheduleReference(scheduleBoundNames)
      const isForeverName = scheduleReference(scheduleForeverNames)
      const isBaseName = scheduleReference(scheduleBaseNames)
      const boundedSelf = scheduleExpressionIsBounded(checker)

      const boundCallResult = (call: ts.CallExpression) => {
        const callee = unwrapCallee(call.expression)
        const boundByName = isBoundName(callee)
        const foreverMatch = isForeverName(callee)
        const baseMatch = isBaseName(callee)
        const foreverOrBase = Array.make(foreverMatch, baseMatch)
        const isForeverOrBase = Array.some(foreverOrBase, Boolean)
        const calleeExpression = unwrapTransparentExpression(call.expression)
        const isPropertyAccess = ts.isPropertyAccessExpression(calleeExpression)
        const method = isPropertyAccess ? calleeExpression.name.text : ""
        const receiver = isPropertyAccess ? calleeExpression.expression : call.expression
        const receiverBounded = isPropertyAccess && boundedSelf(receiver)
        const isBoundMethod = HashSet.has(scheduleBoundMethodNames, method)
        const argumentBounded = Array.some(call.arguments, boundedSelf)
        const eitherSideBounded = receiverBounded || argumentBounded
        const methodCombinesBound = isBoundMethod && eitherSideBounded
        const propertyBoundByMethod = isBoundMethod ? methodCombinesBound : receiverBounded
        const propertyBound = isPropertyAccess && propertyBoundByMethod
        const notPropertyAccess = strictEqual(false)(isPropertyAccess)
        const unboundByShape = isForeverOrBase || notPropertyAccess
        const namedOrProperty = boundByName || propertyBound

        return unboundByShape ? boundByName : namedOrProperty
      }

      return pipe(
        Match.value(unwrapped),
        Match.when(ts.isCallExpression, boundCallResult),
        Match.when(ts.isPropertyAccessExpression, isBoundName),
        Match.orElse(Function.constFalse)
      )
    }

  const sleepNames = Array.of("sleep")
  const cacheMakeNames = Array.make("make", "makeWith")
  const processEnvironmentFinding = makeRuleCandidate("process-environment")
  const globalConfigMutationFinding = makeRuleCandidate("global-config-mutation")

  const processEnvironmentSubject = (context: MatchContext) => (node: ts.Node) =>
    pipe(
      Option.liftPredicate(isAccessExpression)(node),
      Option.filter(isProcessEnvironmentAccess(context.checker)),
      Option.filter(isOutermostAccess),
      Option.filter(() => isProcessEnvironmentProductionSource(context)),
      Option.as("process.env")
    )

  const processEnvironmentFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> =>
      pipe(
        processEnvironmentSubject(context)(node),
        Option.map(Function.flip(processEnvironmentFinding)(node)),
        Option.toArray
      )

  const deleteExpressionTarget = (expression: ts.DeleteExpression) =>
    Option.some(expression.expression)

  const assignmentTarget = (node: ts.Node) =>
    pipe(
      EffectMatch.value(node),
      EffectMatch.when(ts.isBinaryExpression, binaryAssignmentTarget),
      EffectMatch.when(ts.isDeleteExpression, deleteExpressionTarget),
      EffectMatch.orElse(() => Option.none())
    )

  const accessExpressionUnwrapped = (
    access: ts.PropertyAccessExpression | ts.ElementAccessExpression
  ) => unwrapTransparentExpression(access.expression)

  const ambientCapabilityFromTarget =
    (context: MatchContext) =>
    (target: ts.Expression): Option.Option<string> => {
      const unwrapped = unwrapTransparentExpression(target)
      const ambientSubject = ambientCapabilityPropertySubject(context)

      const direct = pipe(
        Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
        Option.flatMap(ambientSubject)
      )

      const nested = pipe(
        Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
        Option.map(accessExpressionUnwrapped),
        Option.filter(ts.isPropertyAccessExpression),
        Option.flatMap(ambientSubject)
      )

      const element = pipe(
        Option.liftPredicate(ts.isElementAccessExpression)(unwrapped),
        Option.map(accessExpressionUnwrapped),
        Option.filter(ts.isPropertyAccessExpression),
        Option.flatMap(ambientSubject)
      )

      return pipe(
        direct,
        Option.orElse(Function.constant(nested)),
        Option.orElse(Function.constant(element))
      )
    }

  const globalConfigMutationFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> =>
      pipe(
        assignmentTarget(node),
        Option.flatMap(ambientCapabilityFromTarget(context)),
        Option.map(() => globalConfigMutationFinding("process.env")(node)),
        Option.toArray
      )

  const testSleepsFinding = makeRuleCandidate("test-sleeps")
  const productionSleepLoopsFinding = makeRuleCandidate("production-sleep-loops")
  const effectVitestModules = Array.make("@effect/vitest", "@effect/vitest/index")

  const effectVitestMember = ({ moduleSpecifier, path }: ImportedMember) => {
    const candidateMatchesModule = (candidate: string) => {
      const matchesModule = strictEqual(candidate)(moduleSpecifier)
      const matchesSubpath = moduleSpecifier.startsWith(`${candidate}/`)
      const matches = Array.make(matchesModule, matchesSubpath)

      return Array.some(matches, Boolean)
    }

    const effectVitestModule = Array.some(effectVitestModules, candidateMatchesModule)
    const testMember = pipe(Array.head(path), Option.contains("it"))
    const checks = Array.make(effectVitestModule, testMember)

    return Array.every(checks, Boolean)
  }

  const importedCallMember = (checker: ts.TypeChecker) =>
    flow(
      Struct.get<ts.CallExpression, "expression">("expression"),
      unwrapCallee,
      importedMemberAt(checker)
    )

  const isEffectVitestTestCall = (checker: ts.TypeChecker) =>
    flow(
      callExpressionOf,
      Option.flatMap(importedCallMember(checker)),
      Option.exists(effectVitestMember)
    )

  const isInsideEffectVitestTest = flow(isEffectVitestTestCall, hasAncestor)

  const isTrueLiteral = (expression: ts.Expression) => {
    const unwrapped = unwrapTransparentExpression(expression)

    return strictEqual(ts.SyntaxKind.TrueKeyword)(unwrapped.kind)
  }

  const isEmptyForCondition = (condition: ts.ForStatement["condition"]) =>
    pipe(Option.fromNullishOr(condition), Option.isNone)

  const whileTrueMatch = (statement: ts.WhileStatement) =>
    isTrueLiteral(statement.expression) ? Option.some(statement) : Option.none()

  const emptyForMatch = (statement: ts.ForStatement) =>
    isEmptyForCondition(statement.condition) ? Option.some(statement) : Option.none()

  const whileTrueStatement = (node: ts.Node) =>
    pipe(
      EffectMatch.value(node),
      EffectMatch.when(ts.isWhileStatement, whileTrueMatch),
      EffectMatch.when(ts.isForStatement, emptyForMatch),
      EffectMatch.orElse(() => Option.none())
    )

  const testSleepFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> => {
      if (!isInsideEffectVitestTest(context.checker)(node)) {
        return emptyRuleCandidates
      }

      return pipe(
        callOrPipeStageSubject(context.checker)("Effect")(sleepNames)(node),
        Option.map(testSleepsFinding("Effect.sleep")),
        Option.toArray
      )
    }

  const ancestorIsWhileTrue = flow(whileTrueStatement, Option.isSome)

  const productionSleepLoopFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> => {
      const matchesSleep = effectApiCall(context.checker)("Effect")(sleepNames)
      const insideWhileTrue = hasAncestor(ancestorIsWhileTrue)

      return pipe(
        callExpressionOf(node),
        Option.filter(matchesSleep),
        Option.filter(insideWhileTrue),
        Option.map(productionSleepLoopsFinding("Effect.sleep")),
        Option.toArray
      )
    }

  const retryNames = Array.of("retry")
  const timesNames = Array.of("times")
  const scheduleNames = Array.of("schedule")
  const whileUntilNames = Array.make("while", "until")

  const unboundedRetryWaiverPattern =
    /unbounded|forever-ok|allow-forever|effect-quality-allow-unbounded-retry/i

  const boundedRetryScheduleFinding = makeRuleCandidate("bounded-retry-schedule")
  const emptyCommentRanges: ReadonlyArray<ts.CommentRange> = Array.empty()

  const commentRangeText = (sourceText: string) => (range: ts.CommentRange) =>
    sourceText.slice(range.pos, range.end)

  const leadingCommentText = (sourceFile: ts.SourceFile) => (node: ts.Node) => {
    const fullStart = node.getFullStart()
    const leadingRanges = ts.getLeadingCommentRanges(sourceFile.text, fullStart)
    const ranges = leadingRanges ?? emptyCommentRanges

    return pipe(ranges, Array.map(commentRangeText(sourceFile.text)), Array.join("\n"))
  }

  const commentsMatchUnboundedWaiver = (comments: string) =>
    unboundedRetryWaiverPattern.test(comments)

  const hasUnboundedRetryWaiver = (sourceFile: ts.SourceFile) =>
    flow(leadingCommentText(sourceFile), commentsMatchUnboundedWaiver)

  const timesPropertyIsBound = (property: ts.ObjectLiteralElementLike) =>
    pipe(
      Option.liftPredicate(ts.isPropertyAssignment)(property),
      Option.map(flow(Struct.get("initializer"), unwrapTransparentExpression)),
      Option.exists((value) => {
        const asNumber = ts.isNumericLiteral(value)
        const asIdentifier = ts.isIdentifier(value)

        return asNumber || asIdentifier
      })
    )

  const propertyScheduleIsBounded =
    (checker: ts.TypeChecker) => (property: ts.ObjectLiteralElementLike) =>
      ts.isPropertyAssignment(property) &&
      scheduleExpressionIsBounded(checker)(property.initializer)

  const objectRetryOptionsAreBounded =
    (checker: ts.TypeChecker) => (object: ts.ObjectLiteralExpression) => {
      const hasTimes = pipe(
        propertyAssignmentNamed(timesNames)(object),
        Option.exists(timesPropertyIsBound)
      )

      const hasWhileUntil = pipe(propertyAssignmentNamed(whileUntilNames)(object), Option.isSome)
      const scheduleProperty = propertyAssignmentNamed(scheduleNames)(object)

      const scheduleBounded = pipe(
        scheduleProperty,
        Option.map(propertyScheduleIsBounded(checker)),
        Option.getOrElse(Function.constant(false))
      )

      const hasSchedule = Option.isSome(scheduleProperty)
      const scheduleMissingBound = strictEqual(false)(scheduleBounded)
      const unboundedSchedule = hasSchedule && scheduleMissingBound
      const lacksTimes = strictEqual(false)(hasTimes)
      const lacksWhileUntil = strictEqual(false)(hasWhileUntil)
      const lacksBound = lacksTimes && lacksWhileUntil
      const unboundedAndUnbound = unboundedSchedule && lacksBound
      const timesOrWhile = hasTimes || hasWhileUntil
      const scheduleAbsent = strictEqual(false)(hasSchedule)
      const boundedOrAbsentSchedule = scheduleBounded || scheduleAbsent
      const explicitlyBounded = timesOrWhile || boundedOrAbsentSchedule
      const notUnboundedCombo = strictEqual(false)(unboundedAndUnbound)
      const boundedFlags = Array.make(notUnboundedCombo, explicitlyBounded)

      return Array.every(boundedFlags, Boolean)
    }

  const retryOptionsAreBounded = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
    pipe(objectLiteralArgument(expression), Option.exists(objectRetryOptionsAreBounded(checker)))

  const expressionIsObjectLiteral = flow(unwrapTransparentExpression, ts.isObjectLiteralExpression)
  const expressionIsFunctionLike = flow(unwrapTransparentExpression, isFunctionLikeExpression)

  const retryPolicyExpression = (call: ts.CallExpression) => {
    const first = callArgumentAt(0)(call)
    const second = callArgumentAt(1)(call)
    const firstIsOptions = pipe(first, Option.exists(expressionIsObjectLiteral))
    const firstIsHandler = pipe(first, Option.exists(expressionIsFunctionLike))

    if (firstIsOptions) {
      return first
    }

    if (Option.isSome(second)) {
      return second
    }

    return firstIsHandler ? Option.none() : first
  }

  const retryPolicyIsUnbounded = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
    const unwrapped = unwrapTransparentExpression(expression)
    const asObject = ts.isObjectLiteralExpression(unwrapped)
    const optionsBounded = asObject ? retryOptionsAreBounded(checker)(unwrapped) : true
    const optionsMissingBound = strictEqual(false)(optionsBounded)
    const optionsUnbounded = asObject && optionsMissingBound
    const scheduleBounded = asObject ? true : scheduleExpressionIsBounded(checker)(unwrapped)
    const scheduleMissingBound = strictEqual(false)(scheduleBounded)
    const notObject = strictEqual(false)(asObject)
    const scheduleUnbounded = notObject && scheduleMissingBound

    return optionsUnbounded || scheduleUnbounded
  }

  const unboundedRetryFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
    pipe(
      retryPolicyExpression(call),
      Option.filter(retryPolicyIsUnbounded(checker)),
      Option.map(() => boundedRetryScheduleFinding("Effect.retry")(call))
    )

  const boundedRetryScheduleFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> => {
      const matchesRetry = effectApiCall(context.checker)("Effect")(retryNames)
      const lacksWaiver = flow(hasUnboundedRetryWaiver(context.sourceFile), strictEqual(false))

      return pipe(
        callExpressionOf(node),
        Option.filter(matchesRetry),
        Option.filter(lacksWaiver),
        Option.flatMap(unboundedRetryFinding(context.checker)),
        Option.toArray
      )
    }

  const runCollectNames = Array.of("runCollect")
  const bufferNames = Array.of("buffer")
  const capacityNames = Array.of("capacity")
  const unboundedStreamCollectFinding = makeRuleCandidate("unbounded-stream-collect")
  const unboundedStreamBufferFinding = makeRuleCandidate("unbounded-stream-buffer")

  const stringLiteralText = flow(
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

  const unboundedStreamCollectFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> =>
      pipe(
        callOrPipeStageSubject(context.checker)("Stream")(runCollectNames)(node),
        Option.map(unboundedStreamCollectFinding("Stream.runCollect")),
        Option.toArray
      )

  const capacityPropertyAssignment = (object: ts.ObjectLiteralExpression) =>
    pipe(propertyAssignmentNamed(capacityNames)(object), Option.filter(ts.isPropertyAssignment))

  const bufferCapacityIsUnbounded = (expression: ts.Expression) =>
    pipe(
      objectLiteralArgument(expression),
      Option.flatMap(capacityPropertyAssignment),
      Option.map(Struct.get("initializer")),
      Option.flatMap(stringLiteralText),
      Option.contains("unbounded")
    )

  const unboundedBufferOptions = (call: ts.CallExpression) => {
    const direct = pipe(callArgumentAt(0)(call), Option.exists(bufferCapacityIsUnbounded))
    const dataFirst = pipe(callArgumentAt(1)(call), Option.exists(bufferCapacityIsUnbounded))

    return direct || dataFirst
  }

  const unboundedStreamBufferFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> => {
      const matchesBuffer = effectApiCall(context.checker)("Stream")(bufferNames)

      return pipe(
        callExpressionOf(node),
        Option.filter(matchesBuffer),
        Option.filter(unboundedBufferOptions),
        Option.map(unboundedStreamBufferFinding('Stream.buffer({ capacity: "unbounded" })')),
        Option.toArray
      )
    }

  const handrolledTtlCacheFinding = makeRuleCandidate("handrolled-ttl-cache")
  const inflightDedupeMapFinding = makeRuleCandidate("inflight-dedupe-map")

  const sourceLooksLikeHandrolledTtlCache = (sourceText: string) => {
    const hasExpires = /\bexpires(?:At|On|In)?\b/u.test(sourceText)
    const hasDateNow = sourceText.includes("Date.now")
    const hasDelete = sourceText.includes(".delete(")
    const hasExpiryAndClock = hasExpires && hasDateNow

    return hasExpiryAndClock && hasDelete
  }

  const handrolledTtlCacheFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> =>
      pipe(
        newMapExpression(node),
        Option.filter(() => sourceLooksLikeHandrolledTtlCache(context.sourceFile.text)),
        Option.map(handrolledTtlCacheFinding("Map")),
        Option.toArray
      )

  const variableMapValueLooksPending =
    (context: MatchContext) => (declaration: ts.VariableDeclaration) => {
      const mentions = typeMentionsConstructor(context.checker)

      const annotated = pipe(
        Option.fromNullishOr(declaration.type),
        Option.map((typeNode) => context.checker.getTypeFromTypeNode(typeNode)),
        Option.exists((type) => {
          const asPromise = mentions("Promise")(type)
          const asEffect = mentions("Effect")(type)

          return asPromise || asEffect
        })
      )

      const fromInitializer = pipe(
        Option.fromNullishOr(declaration.initializer),
        Option.filter(ts.isNewExpression),
        Option.exists(mapValueLooksPending(context))
      )

      return annotated || fromInitializer
    }

  const initializerIsNewMap = (declaration: ts.VariableDeclaration) =>
    pipe(
      Option.fromNullishOr(declaration.initializer),
      Option.flatMap(newMapExpression),
      Option.isSome
    )

  const inflightDedupeMapFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> => {
      const fromNew = pipe(
        newMapExpression(node),
        Option.filter(mapValueLooksPending(context)),
        Option.map(inflightDedupeMapFinding("Map"))
      )

      const fromVariable = pipe(
        Option.liftPredicate(ts.isVariableDeclaration)(node),
        Option.filter(initializerIsNewMap),
        Option.filter(variableMapValueLooksPending(context)),
        Option.map(inflightDedupeMapFinding("Map"))
      )

      const candidates = Array.make(fromNew, fromVariable)

      return Array.flatMap(candidates, Option.toArray)
    }

  const provideNames = Array.make(
    "provide",
    "provideService",
    "provideServiceEffect",
    "provideContext"
  )

  const layerBuildNames = Array.of("build")
  const cachePerRequestFinding = makeRuleCandidate("cache-per-request")
  const scopedClientCacheFinding = makeRuleCandidate("scoped-client-cache")

  const isModuleScopeFunction = (fn: ts.FunctionLikeDeclaration) =>
    pipe(
      EffectMatch.value(fn.parent),
      EffectMatch.when(ts.isSourceFile, Function.constTrue),
      EffectMatch.when(ts.isModuleBlock, Function.constTrue),
      EffectMatch.when(ts.isVariableDeclaration, (declaration) => {
        const statement = declaration.parent?.parent
        const isVariableStatement = ts.isVariableStatement(statement)
        const isSourceFileParent = ts.isSourceFile(statement.parent)

        return isVariableStatement && isSourceFileParent
      }),
      EffectMatch.orElse(Function.constFalse)
    )

  const cacheMakeIsPerRequest = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
    pipe(
      enclosingFunctionLike(call),
      Option.exists((fn) => {
        const hasParameters = fn.parameters.length > 0
        const moduleScope = isModuleScopeFunction(fn)
        const nested = strictEqual(false)(moduleScope)
        const insideLookup = nestedInsideCacheLookup(checker)(call)
        const notLookup = strictEqual(false)(insideLookup)
        const hasParametersOrNested = hasParameters || nested

        return hasParametersOrNested && notLookup
      })
    )

  const cachePerRequestFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> => {
      const matchesCacheMake = effectApiCall(context.checker)("Cache")(cacheMakeNames)

      return pipe(
        callExpressionOf(node),
        Option.filter(matchesCacheMake),
        Option.filter(cacheMakeIsPerRequest(context.checker)),
        Option.map(cachePerRequestFinding("Cache.make")),
        Option.toArray
      )
    }

  const scopedClientCacheFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> => {
      const matchesCall = effectApiCall(context.checker)
      const call = callExpressionOf(node)
      const isProvide = pipe(call, Option.exists(matchesCall("Effect")(provideNames)))
      const isLayerBuild = pipe(call, Option.exists(matchesCall("Layer")(layerBuildNames)))

      const isLayerAcquisition = pipe(
        call,
        Option.exists(matchesCall("Layer")(layerAcquisitionNames))
      )

      const provideOrBuild = isProvide || isLayerBuild
      const matches = provideOrBuild || isLayerAcquisition
      const nestedInLookup = nestedInsideCacheLookup(context.checker)(node)
      const matchedNestedFlags = Array.make(matches, nestedInLookup)
      const matchedNested = Array.every(matchedNestedFlags, Boolean)
      const shouldSkip = strictEqual(false)(matchedNested)

      if (shouldSkip) {
        return emptyRuleCandidates
      }

      const subject = node.getText(context.sourceFile)
      const finding = scopedClientCacheFinding(subject)(node)

      return Array.of(finding)
    }

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
      Option.map(() => typedErrorRecoveryFinding("catchCause")(call))
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
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> => {
      const catchCall = pipe(
        callExpressionOf(node),
        Option.filter(isCatchCauseCall(context.checker))
      )

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

  const foreverNames = Array.of("forever")
  const forkScopedNames = Array.of("forkScoped")

  const streamRunNames = Array.make(
    "runCollect",
    "runDrain",
    "runForEach",
    "runFold",
    "runFoldWhile"
  )

  const layerForeverAcquisitionFinding = makeRuleCandidate("layer-forever-acquisition")

  const expressionContainsEffectApi =
    (checker: ts.TypeChecker) =>
    (namespace: string) =>
    (names: ReadonlyArray<string>) =>
    (expression: ts.Expression) => {
      const onCall = effectApiCall(checker)(namespace)(names)
      const onReference = effectApiReference(checker)(namespace)(names)

      const visitNode = (current: ts.Node) =>
        pipe(
          EffectMatch.value(current),
          EffectMatch.when(ts.isCallExpression, onCall),
          EffectMatch.when(isExpressionReferenceNode, onReference),
          EffectMatch.orElse(Function.constFalse)
        )

      const step = (found: boolean) => (current: ts.Node) => (found ? true : visitNode(current))

      const uncurriedStep = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
        step(found)(current)
      )

      return foldAst(uncurriedStep)(expression)(false)
    }

  const lastImportedMemberPath = (value: ImportedMember) => Array.last(value.path)

  const layerAcquisitionEffectArgument =
    (checker: ts.TypeChecker) =>
    (call: ts.CallExpression): Option.Option<ts.Expression> => {
      const matchesAcquisition = effectApiCall(checker)("Layer")(layerAcquisitionNames)

      if (!matchesAcquisition(call)) {
        return Option.none()
      }

      const callee = unwrapCallee(call.expression)
      const member = importedMemberAt(checker)(callee)
      const calleeMember = pipe(member, Option.flatMap(lastImportedMemberPath))
      const isEffectDual = Option.contains(calleeMember, "effect")

      if (isEffectDual) {
        return call.arguments.length >= 2 ? callArgumentAt(1)(call) : callArgumentAt(0)(call)
      }

      return callArgumentAt(0)(call)
    }

  const acquisitionIsUnforkedForever = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
    const contains = expressionContainsEffectApi(checker)
    const hasFork = contains("Effect")(forkScopedNames)(expression)
    const lacksFork = !hasFork
    const hasForever = contains("Effect")(foreverNames)(expression)
    const hasStreamForever = contains("Stream")(foreverNames)(expression)
    const hasStreamRun = contains("Stream")(streamRunNames)(expression)
    const foreverStreamRun = hasStreamForever && hasStreamRun
    const hasForeverLike = hasForever || foreverStreamRun

    return lacksFork && hasForeverLike
  }

  const layerForeverFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
    pipe(
      layerAcquisitionEffectArgument(checker)(call),
      Option.filter(acquisitionIsUnforkedForever(checker)),
      Option.map(() => layerForeverAcquisitionFinding("Layer.effect")(call))
    )

  const layerForeverAcquisitionFindings =
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> =>
      pipe(
        callExpressionOf(node),
        Option.flatMap(layerForeverFinding(context.checker)),
        Option.toArray
      )

  const isTestClockMember = (member: ImportedMember) => {
    const fromDirect = strictEqual("effect/testing/TestClock")(member.moduleSpecifier)
    const fromTestingModule = strictEqual("effect/testing")(member.moduleSpecifier)
    const path0 = Array.get(member.path, 0)
    const path1 = Array.get(member.path, 1)
    const fromTestingPath = pipe(path0, Option.contains("TestClock"))
    const fromTestingParts = Array.make(fromTestingModule, fromTestingPath)
    const fromTestingNamespace = Array.every(fromTestingParts, Boolean)
    const fromBarrelPath0 = pipe(path0, Option.contains("testing"))
    const fromBarrelPath1 = pipe(path1, Option.contains("TestClock"))
    const fromBarrelModule = strictEqual("effect")(member.moduleSpecifier)
    const fromBarrelParts = Array.make(fromBarrelModule, fromBarrelPath0, fromBarrelPath1)
    const fromBarrel = Array.every(fromBarrelParts, Boolean)
    const sources = Array.make(fromDirect, fromTestingNamespace, fromBarrel)

    return Array.some(sources, Boolean)
  }

  const timeEffectNames = Array.make(
    "sleep",
    "timeout",
    "timeoutTo",
    "timeoutFail",
    "timeoutFailCause"
  )

  const isTestClockApiAt =
    (checker: ts.TypeChecker) => (names: ReadonlyArray<string>) => (expression: ts.Expression) =>
      pipe(
        importedMemberAt(checker)(expression),
        Option.exists((member) => {
          const name = memberLastName(member)
          const nameMatches = Array.contains(names, name)
          const isTestClock = isTestClockMember(member)
          const checks = Array.make(nameMatches, isTestClock)

          return Array.every(checks, Boolean)
        })
      )

  const testClockNames = Array.make(
    "adjust",
    "setTime",
    "withLive",
    "testClockWith",
    "layer",
    "make"
  )

  const testClockReferenceNode = (checker: ts.TypeChecker) => (current: ts.Node) => {
    const isIdentifier = ts.isIdentifier(current)
    const isPropertyAccess = ts.isPropertyAccessExpression(current)
    const referenceKinds = Array.make(isIdentifier, isPropertyAccess)

    if (Array.some(referenceKinds, Boolean)) {
      return pipe(
        importedMemberAt(checker)(current as ts.Expression),
        Option.exists(isTestClockMember)
      )
    }

    const isCall = ts.isCallExpression(current)

    return isCall ? isTestClockApiAt(checker)(testClockNames)(current.expression) : isCall
  }

  const sourceFileHasTestClock = (checker: ts.TypeChecker) => (sourceFile: ts.SourceFile) => {
    const reducer = (found: boolean) => (current: ts.Node) => {
      const hasTestClock = testClockReferenceNode(checker)(current)
      const signals = Array.make(found, hasTestClock)

      return Array.some(signals, Boolean)
    }

    const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      reducer(found)(current)
    )

    return foldAst(uncurriedReducer)(sourceFile)(false)
  }

  const testClockForTime =
    (context: MatchContext) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityRuleCandidate> => {
      if (!isInsideEffectVitestTest(context.checker)(node)) {
        return emptyRuleCandidates
      }

      const timeEffect = callIsEffectApi(context.checker)("Effect")(timeEffectNames)(node)
      const retryEffect = callIsEffectApi(context.checker)("Effect")(retryEffectNames)(node)

      const scheduleBackoff = callIsEffectApi(context.checker)("Schedule")(backoffScheduleNames)(
        node
      )

      const usesTime = Array.make(timeEffect, retryEffect, scheduleBackoff)
      const hasTimeUsage = Array.some(usesTime, Boolean)
      const hasClock = sourceFileHasTestClock(context.checker)(context.sourceFile)
      const quiet = Array.make(!hasTimeUsage, hasClock)

      if (Array.some(quiet, Boolean)) {
        return emptyRuleCandidates
      }

      const expressionText = node.expression.getText()
      const subject = apiSubject(context)(expressionText)(node.expression)
      const finding = makeRuleCandidate("test-clock-for-time")(subject)(node.expression)

      return Array.of(finding)
    }

  const ignoreEffectNames = Array.make("ignore", "ignoreCause")
  const foreverEffectNames = Array.of("forever")
  const scopedForkNames = Array.make("forkScoped", "forkIn")
  const unscopedForkNames = Array.make("forkChild", "forkDetach", "forkDaemon")
  const layerEffectNames = Array.make("effect", "effectDiscard", "scoped", "scopedDiscard")
  const loggerMethodNames = Array.make("log", "info", "warn", "error", "debug", "trace", "fatal")
  const bareLoggerNames = Array.make("log", "info", "warn", "error", "debug", "trace")

  const loggingCallNode = (current: ts.Node) => {
    const isCall = ts.isCallExpression(current)

    if (!isCall) {
      return isCall
    }

    const expression = unwrapTransparentExpression(current.expression)

    if (ts.isPropertyAccessExpression(expression)) {
      const receiver = unwrapTransparentExpression(expression.expression)
      const receiverName = ts.isIdentifier(receiver) ? receiver.text : ""
      const consoleLog = strictEqual("console")(receiverName)
      const loggerMethod = Array.contains(loggerMethodNames, expression.name.text)
      const consoleParts = Array.make(consoleLog, loggerMethod)
      const consoleLogger = Array.every(consoleParts, Boolean)
      const signals = Array.make(consoleLogger, loggerMethod)

      return Array.some(signals, Boolean)
    }

    const isIdentifier = ts.isIdentifier(expression)

    return isIdentifier ? Array.contains(bareLoggerNames, expression.text) : isIdentifier
  }

  const hasNearbyLogging = (node: ts.Node) => {
    const reducer = (found: boolean) => (current: ts.Node) => {
      const hasLogging = loggingCallNode(current)
      const signals = Array.make(found, hasLogging)

      return Array.some(signals, Boolean)
    }

    const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      reducer(found)(current)
    )

    const scan = Function.flip(foldAst(uncurriedReducer))(false)

    return pipe(enclosingFunctionLike(node), Option.exists(scan))
  }

  const fiberSetRunNames = Array.make("run", "add", "makeRuntime")
  const fiberMapRunNames = Array.make("run", "set", "makeRuntime")

  const fiberCollectionSignals = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
    const fiberSet = importedEffectApiAt(checker)("FiberSet")(cacheMakeNames)(call.expression)
    const fiberMap = importedEffectApiAt(checker)("FiberMap")(cacheMakeNames)(call.expression)
    const fiberSetRun = importedEffectApiAt(checker)("FiberSet")(fiberSetRunNames)(call.expression)
    const fiberMapRun = importedEffectApiAt(checker)("FiberMap")(fiberMapRunNames)(call.expression)

    return Array.make(fiberSet, fiberMap, fiberSetRun, fiberMapRun)
  }

  const hasScopedBackgroundAncestor = (checker: ts.TypeChecker) => (node: ts.Node) => {
    const forkScoped = hasEffectCallAncestor(checker)("Effect")(scopedForkNames)(node)

    const fiberCollection = pipe(
      ancestorMatching(ts.isCallExpression)(node),
      Option.exists((call) => {
        const signals = fiberCollectionSignals(checker)(call)

        return Array.some(signals, Boolean)
      })
    )

    const signals = Array.make(forkScoped, fiberCollection)

    return Array.some(signals, Boolean)
  }

  const isLayerAcquisitionContext = (checker: ts.TypeChecker) =>
    hasEffectCallAncestor(checker)("Layer")(layerEffectNames)

  const streamRunForeverNames = Array.make("runForEach", "runDrain", "runFold")

  const scopedBackgroundWork =
    (context: MatchContext) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityRuleCandidate> => {
      const layerAcquisition = isLayerAcquisitionContext(context.checker)(node)

      if (layerAcquisition) {
        return emptyRuleCandidates
      }

      const forever = callIsEffectApi(context.checker)("Effect")(foreverEffectNames)(node)
      const unscopedFork = callIsEffectApi(context.checker)("Effect")(unscopedForkNames)(node)
      const streamRun = callIsEffectApi(context.checker)("Stream")(streamRunForeverNames)(node)

      const underForever = hasEffectCallAncestor(context.checker)("Effect")(foreverEffectNames)(
        node
      )

      const streamRunForeverParts = Array.make(streamRun, underForever)
      const streamRunForever = Array.every(streamRunForeverParts, Boolean)
      const candidates = Array.make(forever, unscopedFork, streamRunForever)
      const hasCandidate = Array.some(candidates, Boolean)
      const scopedAncestor = hasScopedBackgroundAncestor(context.checker)(node)
      const quiet = Array.make(!hasCandidate, scopedAncestor)

      if (Array.some(quiet, Boolean)) {
        return emptyRuleCandidates
      }

      const expressionText = node.expression.getText()
      const subject = apiSubject(context)(expressionText)(node.expression)
      const finding = makeRuleCandidate("scoped-background-work")(subject)(node.expression)

      return Array.of(finding)
    }

  const observableWorkerFailure =
    (context: MatchContext) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityRuleCandidate> => {
      const notIgnore = !callIsEffectApi(context.checker)("Effect")(ignoreEffectNames)(node)
      const nearbyLogging = hasNearbyLogging(node)
      const skip = Array.make(notIgnore, nearbyLogging)

      if (Array.some(skip, Boolean)) {
        return emptyRuleCandidates
      }

      const expressionText = node.expression.getText()
      const subject = apiSubject(context)(expressionText)(node.expression)
      const finding = makeRuleCandidate("observable-worker-failure")(subject)(node.expression)

      return Array.of(finding)
    }

  const assignmentBindingName = (parent: ts.BinaryExpression) => {
    const isEquals = strictEqual(ts.SyntaxKind.EqualsToken)(parent.operatorToken.kind)

    if (!isEquals) {
      return Option.none<string>()
    }

    const left = unwrapTransparentExpression(parent.left)
    const isIdentifier = ts.isIdentifier(left)

    return isIdentifier ? Option.some(left.text) : Option.none()
  }

  const newMapBindingName = (node: ts.NewExpression) => {
    const expression = unwrapTransparentExpression(node.expression)
    const identifierMap = ts.isIdentifier(expression)
    const identifierText = identifierMap ? expression.text : ""
    const identifierIsMap = strictEqual("Map")(identifierText)
    const propertyMap = ts.isPropertyAccessExpression(expression)
    const propertyText = propertyMap ? expression.name.text : ""
    const propertyIsMap = strictEqual("Map")(propertyText)
    const mapIdentifier = Array.make(identifierMap, identifierIsMap)
    const mapProperty = Array.make(propertyMap, propertyIsMap)
    const isIdentifierMap = Array.every(mapIdentifier, Boolean)
    const isPropertyMap = Array.every(mapProperty, Boolean)
    const isMap = Array.make(isIdentifierMap, isPropertyMap)

    if (!Array.some(isMap, Boolean)) {
      return Option.none()
    }

    return pipe(
      Option.fromNullishOr(node.parent),
      Option.flatMap((parent) => {
        const variableName = pipe(
          Option.some(parent),
          Option.filter(ts.isVariableDeclaration),
          Option.map(Struct.get("name")),
          Option.filter(ts.isIdentifier),
          Option.map(Struct.get("text"))
        )

        if (Option.isSome(variableName)) {
          return variableName
        }

        if (ts.isBinaryExpression(parent)) {
          return assignmentBindingName(parent)
        }

        return pipe(
          Option.some(parent),
          Option.filter(ts.isPropertyAssignment),
          Option.map(Struct.get("name")),
          Option.flatMap(propertyNameText)
        )
      })
    )
  }

  const cacheNamePattern = /cache/i
  const ttlFieldPattern = /^(expires?(At)?|expiry|ttl|deadline|validUntil|staleAt)$/i
  const propertyAssignmentName = (assignment: ts.PropertyAssignment) => Option.some(assignment.name)

  const shorthandPropertyAssignmentName = (assignment: ts.ShorthandPropertyAssignment) =>
    Option.some(assignment.name)

  const propertyNameOption = (property: ts.ObjectLiteralElementLike) =>
    pipe(
      Match.value(property),
      Match.when(ts.isPropertyAssignment, propertyAssignmentName),
      Match.when(ts.isShorthandPropertyAssignment, shorthandPropertyAssignmentName),
      Match.orElse(() => Option.none())
    )

  const propertyHasTtlName = (property: ts.ObjectLiteralElementLike) =>
    pipe(
      propertyNameOption(property),
      Option.flatMap(propertyNameText),
      Option.exists((name) => ttlFieldPattern.test(name))
    )

  const objectLiteralHasTtlField = (expression: ts.Expression) => {
    const current = unwrapTransparentExpression(expression)
    const isObjectLiteral = ts.isObjectLiteralExpression(current)

    return isObjectLiteral ? Array.some(current.properties, propertyHasTtlName) : isObjectLiteral
  }

  const cachePreference =
    (context: MatchContext) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> => {
      // Prefer soft Map-as-cache signals because handrolled-ttl-cache owns the complete TTL pattern.
      if (ts.isNewExpression(node)) {
        return pipe(
          newMapBindingName(node),
          Option.filter((name) => cacheNamePattern.test(name)),
          Option.map((name) => {
            const subject = `new Map (${name})`

            return makeRuleCandidate("cache-preference")(subject)(node.expression)
          }),
          Option.map(Array.of),
          Option.getOrElse(Function.constant(emptyRuleCandidates))
        )
      }

      if (!ts.isCallExpression(node)) {
        return emptyRuleCandidates
      }

      const expression = unwrapTransparentExpression(node.expression)
      const isPropertyAccess = ts.isPropertyAccessExpression(expression)

      if (!isPropertyAccess) {
        return emptyRuleCandidates
      }

      const isSetName = strictEqual("set")(expression.name.text)

      if (!isSetName) {
        return emptyRuleCandidates
      }

      const valueOption = Option.fromNullishOr(node.arguments[1])
      const hasTtlValue = pipe(valueOption, Option.exists(objectLiteralHasTtlField))

      if (!hasTtlValue) {
        return emptyRuleCandidates
      }

      // Skip when Effect Cache is already constructed because the preference is satisfied.
      const usesEffectCacheStep = (found: boolean) => (current: ts.Node) => {
        const isCall = ts.isCallExpression(current)

        const isCacheMake =
          isCall && callIsEffectApi(context.checker)("Cache")(cacheMakeNames)(current)

        const signals = Array.make(found, isCacheMake)

        return Array.some(signals, Boolean)
      }

      const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
        usesEffectCacheStep(found)(current)
      )

      const usesEffectCache = foldAst(uncurriedReducer)(context.sourceFile)(false)

      if (usesEffectCache) {
        return emptyRuleCandidates
      }

      const finding = makeRuleCandidate("cache-preference")("Map.set with TTL field")(
        node.expression
      )

      return Array.of(finding)
    }

  const streamPaginateNames = Array.of("paginate")

  const pageTokenPattern =
    /(?:pageToken|nextPageToken|nextCursor|cursor|continuation|pageKey|offset)/i

  const pageTokenNode = (current: ts.Node) => {
    if (ts.isIdentifier(current)) {
      return pageTokenPattern.test(current.text)
    }

    const isStringLiteral = ts.isStringLiteralLike(current)

    return isStringLiteral ? pageTokenPattern.test(current.text) : isStringLiteral
  }

  const isPageTokenLoop = (node: ts.Node) => {
    const isWhile = ts.isWhileStatement(node)
    const isDo = ts.isDoStatement(node)
    const isFor = ts.isForStatement(node)
    const isLoop = Array.make(isWhile, isDo, isFor)
    const loopNode = Array.some(isLoop, Boolean)

    if (!loopNode) {
      return loopNode
    }

    const reducer = (found: boolean) => (current: ts.Node) => {
      const hasPageToken = pageTokenNode(current)
      const signals = Array.make(found, hasPageToken)

      return Array.some(signals, Boolean)
    }

    const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      reducer(found)(current)
    )

    return foldAst(uncurriedReducer)(node)(false)
  }

  const pageAccumulateMethods = Array.make("push", "concat", "append", "appendAll", "yield")

  const propertyAccessNameText = flow(
    Struct.get<ts.PropertyAccessExpression, "name">("name"),
    Struct.get("text")
  )

  const accumulatesPageMethod = (access: ts.PropertyAccessExpression) => {
    const method = propertyAccessNameText(access)

    return Array.contains(pageAccumulateMethods, method)
  }

  const pageAccumulateNode = (current: ts.Node) => {
    if (!ts.isCallExpression(current)) {
      return ts.isYieldExpression(current)
    }

    const propertyCallee = Option.liftPredicate(ts.isPropertyAccessExpression)(current.expression)

    return Option.exists(propertyCallee, accumulatesPageMethod)
  }

  const loopAccumulatesPages = (node: ts.Node) => {
    const reducer = (found: boolean) => (current: ts.Node) => {
      const accumulates = pageAccumulateNode(current)
      const signals = Array.make(found, accumulates)

      return Array.some(signals, Boolean)
    }

    const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      reducer(found)(current)
    )

    return foldAst(uncurriedReducer)(node)(false)
  }

  const streamPagination =
    (context: MatchContext) =>
    (node: ts.Node): ReadonlyArray<EffectQualityRuleCandidate> => {
      const pageTokenLoop = isPageTokenLoop(node)
      const accumulates = loopAccumulatesPages(node)
      const eligible = Array.make(pageTokenLoop, accumulates)

      if (!Array.every(eligible, Boolean)) {
        return emptyRuleCandidates
      }

      // Stay quiet when Stream.paginate is already chosen because the preferred API is present.
      const usesPaginateStep = (found: boolean) => (current: ts.Node) => {
        const isCall = ts.isCallExpression(current)

        const isPaginateCall =
          isCall && callIsEffectApi(context.checker)("Stream")(streamPaginateNames)(current)

        const signals = Array.make(found, isPaginateCall)

        return Array.some(signals, Boolean)
      }

      const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
        usesPaginateStep(found)(current)
      )

      const scan = Function.flip(foldAst(uncurriedReducer))(false)
      const usesPaginate = pipe(enclosingFunctionLike(node), Option.exists(scan))

      if (usesPaginate) {
        return emptyRuleCandidates
      }

      const finding = makeRuleCandidate("stream-pagination")("page-token loop")(node)

      return Array.of(finding)
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

  const typedBoundaryError =
    (context: MatchContext) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityRuleCandidate> => {
      const catchAllCall = callIsEffectApi(context.checker)("Effect")(catchAllNames)(node)
      const catchCauseCall = callIsEffectApi(context.checker)("Effect")(catchCauseNames)(node)
      const catchAllParts = Array.make(catchAllCall, catchCauseCall)
      const catchAll = Array.some(catchAllParts, Boolean)

      if (!catchAll) {
        return emptyRuleCandidates
      }

      const handlerOption = pipe(
        Option.fromNullishOr(node.arguments[1]),
        Option.orElse(() => Option.fromNullishOr(node.arguments[0]))
      )

      if (Option.isNone(handlerOption)) {
        return emptyRuleCandidates
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
        return emptyRuleCandidates
      }

      const expressionText = node.expression.getText()
      const subject = apiSubject(context)(expressionText)(node.expression)
      const finding = makeRuleCandidate("typed-boundary-error")(subject)(node.expression)

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
  const cacheKinds = Array.make(ts.SyntaxKind.CallExpression, ts.SyntaxKind.NewExpression)

  const paginationKinds = Array.make(
    ts.SyntaxKind.WhileStatement,
    ts.SyntaxKind.DoStatement,
    ts.SyntaxKind.ForStatement
  )

  const candidatesWithoutIndex =
    (
      find: (context: MatchContext) => (node: ts.Node) => ReadonlyArray<EffectQualityRuleCandidate>
    ) =>
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
      find(context)

  const callCandidatesWithoutIndex =
    (
      find: (
        context: MatchContext
      ) => (node: ts.CallExpression) => ReadonlyArray<EffectQualityRuleCandidate>
    ) =>
    (context: MatchContext) =>
    (_index: EffectQualityIndex) =>
      flow((node: ts.Node) => node as ts.CallExpression, find(context))

  const makeCheck =
    (syntaxKinds: ReadonlyArray<ts.SyntaxKind>) =>
    (candidates: EffectQualityRuleCheck["candidates"]) =>
    (kind: EffectQualityRuleData["kind"]) =>
      new EffectQualityRuleCheck({ kind, syntaxKinds, candidates })

  const runtimeCheck = makeCheck(runtimeKinds)
  const callCheck = makeCheck(callKinds)
  const processEnvironment = runtimeCheck(processEnvironmentFindings)("process-environment")
  const testSleeps = runtimeCheck(testSleepFindings)("test-sleeps")
  const sleepLoops = runtimeCheck(productionSleepLoopFindings)("production-sleep-loops")
  const streamCollect = runtimeCheck(unboundedStreamCollectFindings)("unbounded-stream-collect")
  const streamBuffer = runtimeCheck(unboundedStreamBufferFindings)("unbounded-stream-buffer")
  const ttlCache = runtimeCheck(handrolledTtlCacheFindings)("handrolled-ttl-cache")
  const inflightMap = runtimeCheck(inflightDedupeMapFindings)("inflight-dedupe-map")
  const cachePerRequest = runtimeCheck(cachePerRequestFindings)("cache-per-request")
  const scopedClientCache = runtimeCheck(scopedClientCacheFindings)("scoped-client-cache")
  const typedRecovery = runtimeCheck(typedErrorRecoveryFindings)("typed-error-recovery")
  const foreverLayer = runtimeCheck(layerForeverAcquisitionFindings)("layer-forever-acquisition")
  const configMutation = runtimeCheck(globalConfigMutationFindings)("global-config-mutation")
  const retrySchedule = runtimeCheck(boundedRetryScheduleFindings)("bounded-retry-schedule")
  const testClockCandidates = callCandidatesWithoutIndex(testClockForTime)
  const testClock = callCheck(testClockCandidates)("test-clock-for-time")
  const backgroundCandidates = callCandidatesWithoutIndex(scopedBackgroundWork)
  const background = callCheck(backgroundCandidates)("scoped-background-work")
  const workerCandidates = callCandidatesWithoutIndex(observableWorkerFailure)
  const workerFailure = callCheck(workerCandidates)("observable-worker-failure")
  const cacheCandidates = candidatesWithoutIndex(cachePreference)
  const cachePreferenceCheck = makeCheck(cacheKinds)(cacheCandidates)("cache-preference")
  const paginationCandidates = candidatesWithoutIndex(streamPagination)
  const pagination = makeCheck(paginationKinds)(paginationCandidates)("stream-pagination")
  const boundaryErrorCandidates = callCandidatesWithoutIndex(typedBoundaryError)
  const boundaryError = callCheck(boundaryErrorCandidates)("typed-boundary-error")

  return Array.make(
    processEnvironment,
    testSleeps,
    sleepLoops,
    streamCollect,
    streamBuffer,
    ttlCache,
    inflightMap,
    cachePerRequest,
    scopedClientCache,
    typedRecovery,
    foreverLayer,
    configMutation,
    retrySchedule,
    testClock,
    background,
    workerFailure,
    cachePreferenceCheck,
    pagination,
    boundaryError
  )
}

export const effectQualityRuntimeChecks = makeEffectQualityRuntimeChecks()
