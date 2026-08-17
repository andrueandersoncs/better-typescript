import * as ts from "typescript"
import {
  Array,
  Function,
  Option,
  Predicate,
  Struct,
  flow,
  pipe,
  Match as EffectMatch,
  HashSet,
  Match
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type { MatchContext } from "../../matcher/matchContext.js"
import { foldAst } from "../../sources/foldAst.js"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import { collectFindings } from "../../support/collectFindings.js"
import { callExpressionOf } from "../../support/callExpressionOf.js"
import { binaryAssignmentTarget } from "../../support/hasAssignmentOperator.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { enclosingFunctionLike } from "../functionalCoreEffect/enclosingFunctionLike.js"
import { importedMemberAt } from "../functionalCoreEffect/importedMemberAt.js"
import type { ImportedMember } from "../functionalCoreEffect/importedMember.js"
import { propertyAssignmentNamed } from "../functionalCoreEffect/propertyAssignments.js"
import { ambientCapabilityPropertySubject } from "../functionalCoreEffect/ambientCapabilityPropertySubject.js"
import { EffectQualityIndex } from "./effectQualityIndex.js"
import { EffectQualityRuleFinding } from "./effectQualityRuleFinding.js"
import { emptyRuleFindings } from "./emptyRuleFindings.js"
import { isAccessExpression } from "./isAccessExpression.js"
import { isRootRole } from "./isRootRole.js"
import { isTestRole } from "./isTestRole.js"
import { makeRuleFinding } from "./makeRuleFinding.js"
import { isOutermostAccess } from "./isOutermostAccess.js"
import { isProcessEnvironmentAccess } from "./processEnvironmentAccess.js"
import { roleForSourceFile } from "./roleForSourceFile.js"
import { importedEffectApiAt } from "../functionalCoreEffect/importedEffectApiAt.js"
import { identifierTextIsPipe } from "./identifierTextIsPipe.js"
import { hasEffectCallAncestor } from "../functionalCoreEffect/hasEffectCallAncestor.js"
import { ancestorMatching } from "./ancestorMatching.js"
import { apiSubject } from "./apiSubject.js"
import { backoffScheduleNames } from "./backoffScheduleNames.js"
import { callIsEffectApi } from "./callIsEffectApi.js"
import { EffectQualityAdviceFinding } from "./effectQualityAdviceFinding.js"
import { emptyAdviceFindings } from "./emptyAdviceFindings.js"
import { makeAdviceFinding } from "./makeAdviceFinding.js"
import { memberLastName } from "./memberLastName.js"
import { isProductionRole } from "./productionRoles.js"
import { retryEffectNames } from "./retryEffectNames.js"
import { stringLiteralArgument } from "./stringLiteralArgument.js"
import { propertyNameText } from "../../support/propertyNameText.js"
import { hasExportModifier } from "../../support/hasExportModifier.js"
import { declarationNameText } from "./declarationNameText.js"

const makeEffectQualityRuntimeFeature = () => {
  const catchCauseNames = Array.make("catchCause", "catchAllCause")

  const accessNameIsPipe = (access: ts.PropertyAccessExpression) =>
    strictEqual("pipe")(access.name.text)

  const callArgumentAt = (index: number) => (call: ts.CallExpression) =>
    Option.fromNullishOr(call.arguments[index])

  const effectApiCall =
    (checker: ts.TypeChecker) =>
    (namespace: string) =>
    (names: ReadonlyArray<string>) =>
    (node: ts.CallExpression) => {
      const callee = unwrapCallee(node.expression)

      return importedEffectApiAt(checker, callee, namespace, names)
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
    pipe(propertyAssignmentNamed(object, lookupNames), Option.filter(ts.isPropertyAssignment))

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
    (checker: ts.TypeChecker) =>
    (namespace: string) =>
    (names: ReadonlyArray<string>) =>
    (expression: ts.Expression) => {
      const unwrapped = unwrapTransparentExpression(expression)

      return importedEffectApiAt(checker, unwrapped, namespace, names)
    }

  const pipeNames = Array.of("pipe")

  const isPipeCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
    const callee = unwrapCallee(call.expression)
    const fromEffect = importedEffectApiAt(checker, callee, "Function", pipeNames)

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
      const visit = (current: ts.Type, seen: ReadonlyArray<ts.Type>): boolean => {
        const previousEqualsCurrent = strictEqual(current)
        const alreadySeen = Array.some(seen, previousEqualsCurrent)
        const notSeen = strictEqual(false)(alreadySeen)
        const nextSeen = Array.append(seen, current)
        const symbolName = typeSymbolName(current)
        const matchesName = strictEqual(name)(symbolName)
        const unionParts = current.isUnionOrIntersection() ? current.types : emptyTypes
        const visitNext = (candidate: ts.Type) => visit(candidate, nextSeen)
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

      return visit(type, emptyTypes)
    }

  const mapValueLooksPending = (context: MatchContext) => (expression: ts.NewExpression) => {
    const type = context.checker.getTypeAtLocation(expression)
    const mentions = typeMentionsConstructor(context.checker)
    const asPromise = mentions("Promise")(type)
    const asEffect = mentions("Effect")(type)

    return asPromise || asEffect
  }

  const typedErrorRecoveryFinding = makeRuleFinding("typed-error-recovery")

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

  const ambientCapabilitySubject =
    (context: MatchContext) => (access: ts.PropertyAccessExpression) =>
      ambientCapabilityPropertySubject(context, access)

  const cacheMakeNames = Array.make("make", "makeWith")
  const processEnvironmentFinding = makeRuleFinding("process-environment")
  const globalConfigMutationFinding = makeRuleFinding("global-config-mutation")

  const isRootOrTest = (role: ArchitectureRole) => {
    const root = isRootRole(role)
    const test = isTestRole(role)

    return root || test
  }

  const isNonRootOrTest = Predicate.not(isRootOrTest)

  const processEnvironmentSubject = (context: MatchContext, node: ts.Node) =>
    pipe(
      Option.liftPredicate(isAccessExpression)(node),
      Option.filter(isProcessEnvironmentAccess(context.checker)),
      Option.filter(isOutermostAccess),
      Option.as("process.env")
    )

  const processEnvironmentFindings = (
    context: MatchContext,
    index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> =>
    pipe(
      roleForSourceFile(index, context.sourceFile),
      Option.filter(isNonRootOrTest),
      Option.flatMap(() => processEnvironmentSubject(context, node)),
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
      const ambientSubject = ambientCapabilitySubject(context)

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

  const globalConfigMutationFindings = (
    context: MatchContext,
    index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> =>
    pipe(
      roleForSourceFile(index, context.sourceFile),
      Option.filter(isTestRole),
      Option.flatMap(() =>
        pipe(
          assignmentTarget(node),
          Option.flatMap(ambientCapabilityFromTarget(context)),
          Option.map(() => globalConfigMutationFinding("process.env")(node))
        )
      ),
      Option.toArray
    )

  const testSleepsFinding = makeRuleFinding("test-sleeps")
  const productionSleepLoopsFinding = makeRuleFinding("production-sleep-loops")

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

  const testSleepFindings = (
    context: MatchContext,
    index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> =>
    pipe(
      roleForSourceFile(index, context.sourceFile),
      Option.filter(isTestRole),
      Option.flatMap(() => callOrPipeStageSubject(context.checker)("Effect")(sleepNames)(node)),
      Option.map(testSleepsFinding("Effect.sleep")),
      Option.toArray
    )

  const ancestorIsWhileTrue = flow(whileTrueStatement, Option.isSome)

  const productionSleepLoopFindings = (
    context: MatchContext,
    index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> => {
    const role = roleForSourceFile(index, context.sourceFile)
    const isTest = Option.exists(role, isTestRole)
    const missingRole = Option.isNone(role)
    const skip = isTest || missingRole

    if (skip) {
      return emptyRuleFindings
    }

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

  const boundedRetryScheduleFinding = makeRuleFinding("bounded-retry-schedule")
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
        propertyAssignmentNamed(object, timesNames),
        Option.exists(timesPropertyIsBound)
      )

      const hasWhileUntil = pipe(propertyAssignmentNamed(object, whileUntilNames), Option.isSome)
      const scheduleProperty = propertyAssignmentNamed(object, scheduleNames)

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

  const boundedRetryScheduleFindings = (
    context: MatchContext,
    _index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> => {
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
  const unboundedStreamCollectFinding = makeRuleFinding("unbounded-stream-collect")
  const unboundedStreamBufferFinding = makeRuleFinding("unbounded-stream-buffer")
  const isNonTestRole = Predicate.not(isTestRole)

  const stringLiteralText = flow(
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

  const unboundedStreamCollectFindings = (
    context: MatchContext,
    index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> =>
    pipe(
      roleForSourceFile(index, context.sourceFile),
      Option.filter(isNonTestRole),
      Option.flatMap(() =>
        callOrPipeStageSubject(context.checker)("Stream")(runCollectNames)(node)
      ),
      Option.map(unboundedStreamCollectFinding("Stream.runCollect")),
      Option.toArray
    )

  const capacityPropertyAssignment = (object: ts.ObjectLiteralExpression) =>
    pipe(propertyAssignmentNamed(object, capacityNames), Option.filter(ts.isPropertyAssignment))

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

  const unboundedStreamBufferFindings = (
    context: MatchContext,
    _index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> => {
    const matchesBuffer = effectApiCall(context.checker)("Stream")(bufferNames)

    return pipe(
      callExpressionOf(node),
      Option.filter(matchesBuffer),
      Option.filter(unboundedBufferOptions),
      Option.map(unboundedStreamBufferFinding('Stream.buffer({ capacity: "unbounded" })')),
      Option.toArray
    )
  }

  const handrolledTtlCacheFinding = makeRuleFinding("handrolled-ttl-cache")
  const inflightDedupeMapFinding = makeRuleFinding("inflight-dedupe-map")

  const sourceLooksLikeHandrolledTtlCache = (sourceText: string) => {
    const hasExpires = /\bexpires(?:At|On|In)?\b/u.test(sourceText)
    const hasDateNow = sourceText.includes("Date.now")
    const hasDelete = sourceText.includes(".delete(")
    const hasExpiryAndClock = hasExpires && hasDateNow

    return hasExpiryAndClock && hasDelete
  }

  const handrolledTtlCacheFindings = (
    context: MatchContext,
    _index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> =>
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

  const inflightDedupeMapFindings = (
    context: MatchContext,
    _index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> => {
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
  const cachePerRequestFinding = makeRuleFinding("cache-per-request")
  const scopedClientCacheFinding = makeRuleFinding("scoped-client-cache")

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

  const cachePerRequestFindings = (
    context: MatchContext,
    _index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> => {
    const matchesCacheMake = effectApiCall(context.checker)("Cache")(cacheMakeNames)

    return pipe(
      callExpressionOf(node),
      Option.filter(matchesCacheMake),
      Option.filter(cacheMakeIsPerRequest(context.checker)),
      Option.map(cachePerRequestFinding("Cache.make")),
      Option.toArray
    )
  }

  const scopedClientCacheFindings = (
    context: MatchContext,
    _index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> => {
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
      return emptyRuleFindings
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

  const typedErrorRecoveryFindings = (
    context: MatchContext,
    _index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> => {
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

  const layerForeverAcquisitionFinding = makeRuleFinding("layer-forever-acquisition")

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

      const step = (found: boolean, current: ts.Node) => (found ? true : visitNode(current))

      return foldAst(step)(expression)(false)
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
      const member = importedMemberAt(checker, callee)
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

  const layerForeverAcquisitionFindings = (
    context: MatchContext,
    _index: EffectQualityIndex,
    node: ts.Node
  ): ReadonlyArray<EffectQualityRuleFinding> =>
    pipe(
      callExpressionOf(node),
      Option.flatMap(layerForeverFinding(context.checker)),
      Option.toArray
    )

  const runtimeCollectors: ReadonlyArray<
    (
      context: MatchContext,
      index: EffectQualityIndex,
      node: ts.Node
    ) => ReadonlyArray<EffectQualityRuleFinding>
  > = Array.make(
    processEnvironmentFindings,
    testSleepFindings,
    productionSleepLoopFindings,
    unboundedStreamCollectFindings,
    unboundedStreamBufferFindings,
    handrolledTtlCacheFindings,
    inflightDedupeMapFindings,
    cachePerRequestFindings,
    scopedClientCacheFindings,
    typedErrorRecoveryFindings,
    layerForeverAcquisitionFindings,
    globalConfigMutationFindings,
    boundedRetryScheduleFindings
  )

  const runtimeRuleFindings = collectFindings(runtimeCollectors)

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
        importedMemberAt(checker, expression),
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
        importedMemberAt(checker, current as ts.Expression),
        Option.exists(isTestClockMember)
      )
    }

    const isCall = ts.isCallExpression(current)

    return isCall ? isTestClockApiAt(checker)(testClockNames)(current.expression) : isCall
  }

  const sourceFileHasTestClock = (checker: ts.TypeChecker) => (sourceFile: ts.SourceFile) => {
    const reducer = (found: boolean, current: ts.Node) => {
      const hasTestClock = testClockReferenceNode(checker)(current)
      const signals = Array.make(found, hasTestClock)

      return Array.some(signals, Boolean)
    }

    return foldAst(reducer)(sourceFile)(false)
  }

  const isItLiveCall = (node: ts.CallExpression) => {
    const expression = unwrapTransparentExpression(node.expression)
    const isPropertyAccess = ts.isPropertyAccessExpression(expression)

    if (!isPropertyAccess) {
      return isPropertyAccess
    }

    const isLiveName = strictEqual("live")(expression.name.text)

    if (!isLiveName) {
      return isLiveName
    }

    const receiver = unwrapTransparentExpression(expression.expression)
    const isIdentifier = ts.isIdentifier(receiver)
    const receiverText = isIdentifier ? receiver.text : ""
    const isItName = strictEqual("it")(receiverText)
    const checks = Array.make(isIdentifier, isItName)

    return Array.every(checks, Boolean)
  }

  const testLiveRuntime =
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      const testRole = isTestRole(role)
      const liveCall = isItLiveCall(node)
      const eligible = Array.make(testRole, liveCall)

      if (!Array.every(eligible, Boolean)) {
        return emptyAdviceFindings
      }

      const finding = makeAdviceFinding("test-live-runtime")("it.live")(node.expression)

      return Array.of(finding)
    }

  const testClockForTime =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      if (!isTestRole(role)) {
        return emptyAdviceFindings
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
        return emptyAdviceFindings
      }

      const expressionText = node.expression.getText()
      const subject = apiSubject(context)(expressionText)(node.expression)
      const finding = makeAdviceFinding("test-clock-for-time")(subject)(node.expression)

      return Array.of(finding)
    }

  const layerMergeNames = Array.of("mergeAll")
  const layerProvideMergeNames = Array.of("provideMerge")

  const authorityReferenceKeyPattern =
    /(?:secret|token|password|credential|api[_-]?key|auth|database|db|postgres|mysql|mongo|redis|sql|http|https|transport|client|connection|pool|smtp|s3|bucket)/i

  const layerAuthorityVisibility =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      if (isTestRole(role)) {
        return emptyAdviceFindings
      }

      const referenceNames = Array.of("Reference")
      const isReference = callIsEffectApi(context.checker)("Context")(referenceNames)(node)

      if (!isReference) {
        return emptyAdviceFindings
      }

      const key = pipe(stringLiteralArgument(0)(node), Option.getOrElse(Function.constant("")))
      const hasKey = key.length > 0
      const matchesAuthorityKey = authorityReferenceKeyPattern.test(key)
      const authorityParts = Array.make(hasKey, matchesAuthorityKey)
      const looksAuthoritative = Array.every(authorityParts, Boolean)

      if (!looksAuthoritative) {
        return emptyAdviceFindings
      }

      const subject = `Context.Reference(${JSON.stringify(key)})`
      const finding = makeAdviceFinding("layer-authority-visibility")(subject)(node.expression)

      return Array.of(finding)
    }

  const layerComposition =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      // Non-root Layer.provide is owned by functional-core because only roots own composition advice.
      const mergeAll = callIsEffectApi(context.checker)("Layer")(layerMergeNames)(node)
      const rootRole = isRootRole(role)

      const provideMergeCall = callIsEffectApi(context.checker)("Layer")(layerProvideMergeNames)(
        node
      )

      const provideMergeParts = Array.make(rootRole, provideMergeCall)
      const provideMerge = Array.every(provideMergeParts, Boolean)
      const candidates = Array.make(mergeAll, provideMerge)
      const hasCandidate = Array.some(candidates, Boolean)
      const testRole = isTestRole(role)
      const skip = Array.make(!hasCandidate, testRole)

      if (Array.some(skip, Boolean)) {
        return emptyAdviceFindings
      }

      // mergeAll is advice in any non-test role because provideMerge is root-only.
      const allowProvideMerge = isRootRole(role)
      const emit = Array.make(mergeAll, allowProvideMerge)

      if (!Array.some(emit, Boolean)) {
        return emptyAdviceFindings
      }

      const expressionText = node.expression.getText()
      const subject = apiSubject(context)(expressionText)(node.expression)
      const finding = makeAdviceFinding("layer-composition")(subject)(node.expression)

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
    const reducer = (found: boolean, current: ts.Node) => {
      const hasLogging = loggingCallNode(current)
      const signals = Array.make(found, hasLogging)

      return Array.some(signals, Boolean)
    }

    const scan = Function.flip(foldAst(reducer))(false)

    return pipe(enclosingFunctionLike(node), Option.exists(scan))
  }

  const fiberSetRunNames = Array.make("run", "add", "makeRuntime")
  const fiberMapRunNames = Array.make("run", "set", "makeRuntime")

  const fiberCollectionSignals = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
    const fiberSet = importedEffectApiAt(checker, call.expression, "FiberSet", cacheMakeNames)
    const fiberMap = importedEffectApiAt(checker, call.expression, "FiberMap", cacheMakeNames)
    const fiberSetRun = importedEffectApiAt(checker, call.expression, "FiberSet", fiberSetRunNames)
    const fiberMapRun = importedEffectApiAt(checker, call.expression, "FiberMap", fiberMapRunNames)

    return Array.make(fiberSet, fiberMap, fiberSetRun, fiberMapRun)
  }

  const hasScopedBackgroundAncestor = (checker: ts.TypeChecker) => (node: ts.Node) => {
    const forkScoped = hasEffectCallAncestor(checker, node, "Effect", scopedForkNames)

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

  const isLayerAcquisitionContext = (checker: ts.TypeChecker) => (node: ts.Node) =>
    hasEffectCallAncestor(checker, node, "Layer", layerEffectNames)

  const streamRunForeverNames = Array.make("runForEach", "runDrain", "runFold")

  const scopedBackgroundWork =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      const testRole = isTestRole(role)
      const nonProduction = !isProductionRole(role)
      // Layer forever acquisition is a reported rule because that shape is owned elsewhere.
      const layerAcquisition = isLayerAcquisitionContext(context.checker)(node)
      const skip = Array.make(testRole, nonProduction, layerAcquisition)

      if (Array.some(skip, Boolean)) {
        return emptyAdviceFindings
      }

      const forever = callIsEffectApi(context.checker)("Effect")(foreverEffectNames)(node)
      const unscopedFork = callIsEffectApi(context.checker)("Effect")(unscopedForkNames)(node)
      const streamRun = callIsEffectApi(context.checker)("Stream")(streamRunForeverNames)(node)

      const underForever = hasEffectCallAncestor(
        context.checker,
        node,
        "Effect",
        foreverEffectNames
      )

      const streamRunForeverParts = Array.make(streamRun, underForever)
      const streamRunForever = Array.every(streamRunForeverParts, Boolean)
      const candidates = Array.make(forever, unscopedFork, streamRunForever)
      const hasCandidate = Array.some(candidates, Boolean)
      const scopedAncestor = hasScopedBackgroundAncestor(context.checker)(node)
      const quiet = Array.make(!hasCandidate, scopedAncestor)

      if (Array.some(quiet, Boolean)) {
        return emptyAdviceFindings
      }

      const expressionText = node.expression.getText()
      const subject = apiSubject(context)(expressionText)(node.expression)
      const finding = makeAdviceFinding("scoped-background-work")(subject)(node.expression)

      return Array.of(finding)
    }

  const observableWorkerFailure =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      const testRole = isTestRole(role)
      const nonProduction = !isProductionRole(role)
      const notIgnore = !callIsEffectApi(context.checker)("Effect")(ignoreEffectNames)(node)
      const nearbyLogging = hasNearbyLogging(node)
      const skip = Array.make(testRole, nonProduction, notIgnore, nearbyLogging)

      if (Array.some(skip, Boolean)) {
        return emptyAdviceFindings
      }

      const expressionText = node.expression.getText()
      const subject = apiSubject(context)(expressionText)(node.expression)
      const finding = makeAdviceFinding("observable-worker-failure")(subject)(node.expression)

      return Array.of(finding)
    }

  const effectQualityRuntimeFindings = (
    context: MatchContext,
    _index: EffectQualityIndex,
    role: ArchitectureRole,
    node: ts.Node
  ): ReadonlyArray<EffectQualityAdviceFinding> => {
    if (!ts.isCallExpression(node)) {
      return emptyAdviceFindings
    }

    const liveRuntimeFindings = testLiveRuntime(role)(node)
    const clockFindings = testClockForTime(context)(role)(node)
    const authorityFindings = layerAuthorityVisibility(context)(role)(node)
    const compositionFindings = layerComposition(context)(role)(node)
    const backgroundFindings = scopedBackgroundWork(context)(role)(node)
    const workerFindings = observableWorkerFailure(context)(role)(node)

    const collectors = Array.make(
      liveRuntimeFindings,
      clockFindings,
      authorityFindings,
      compositionFindings,
      backgroundFindings,
      workerFindings
    )

    return Array.flatten(collectors)
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
    (role: ArchitectureRole) =>
    (node: ts.Node): ReadonlyArray<EffectQualityAdviceFinding> => {
      const testRole = isTestRole(role)
      const nonProduction = !isProductionRole(role)
      const skip = Array.make(testRole, nonProduction)

      if (Array.some(skip, Boolean)) {
        return emptyAdviceFindings
      }

      // Prefer soft Map-as-cache signals because handrolled-ttl-cache owns the complete TTL pattern.
      if (ts.isNewExpression(node)) {
        return pipe(
          newMapBindingName(node),
          Option.filter((name) => cacheNamePattern.test(name)),
          Option.map((name) => {
            const subject = `new Map (${name})`

            return makeAdviceFinding("cache-preference")(subject)(node.expression)
          }),
          Option.map(Array.of),
          Option.getOrElse(Function.constant(emptyAdviceFindings))
        )
      }

      if (!ts.isCallExpression(node)) {
        return emptyAdviceFindings
      }

      const expression = unwrapTransparentExpression(node.expression)
      const isPropertyAccess = ts.isPropertyAccessExpression(expression)

      if (!isPropertyAccess) {
        return emptyAdviceFindings
      }

      const isSetName = strictEqual("set")(expression.name.text)

      if (!isSetName) {
        return emptyAdviceFindings
      }

      const valueOption = Option.fromNullishOr(node.arguments[1])
      const hasTtlValue = pipe(valueOption, Option.exists(objectLiteralHasTtlField))

      if (!hasTtlValue) {
        return emptyAdviceFindings
      }

      // Skip when Effect Cache is already constructed because the preference is satisfied.
      const usesEffectCacheReducer = (found: boolean, current: ts.Node) => {
        const isCall = ts.isCallExpression(current)

        const isCacheMake =
          isCall && callIsEffectApi(context.checker)("Cache")(cacheMakeNames)(current)

        const signals = Array.make(found, isCacheMake)

        return Array.some(signals, Boolean)
      }

      const usesEffectCache = foldAst(usesEffectCacheReducer)(context.sourceFile)(false)

      if (usesEffectCache) {
        return emptyAdviceFindings
      }

      const finding = makeAdviceFinding("cache-preference")("Map.set with TTL field")(
        node.expression
      )

      return Array.of(finding)
    }

  const isDirectExportStatement = (node: ts.Node): node is ts.Statement => {
    const variableStatement = ts.isVariableStatement(node)
    const functionDeclaration = ts.isFunctionDeclaration(node)
    const classDeclaration = ts.isClassDeclaration(node)
    const interfaceDeclaration = ts.isInterfaceDeclaration(node)
    const typeAliasDeclaration = ts.isTypeAliasDeclaration(node)

    const kinds = Array.make(
      variableStatement,
      functionDeclaration,
      classDeclaration,
      interfaceDeclaration,
      typeAliasDeclaration
    )

    return Array.some(kinds, Boolean)
  }

  const isExportedDeclaration = (node: ts.Node) =>
    isDirectExportStatement(node)
      ? hasExportModifier(node)
      : pipe(ancestorMatching(ts.isVariableStatement)(node), Option.exists(hasExportModifier))

  const fiberTypeNamePattern = /Fiber/i
  const fiberMapNames = Array.make("make", "set", "run")
  const keyedMapNamePattern = /fiber|workers|inflight|running|keyed/i
  const keyedReceiverPattern = /map|fibers|workers|inflight|running|keyed/i
  const forkValueNames = Array.make("forkChild", "forkScoped", "forkDetach", "forkIn", "forkDaemon")

  const keyedStreamWork =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.Node): ReadonlyArray<EffectQualityAdviceFinding> => {
      const testRole = isTestRole(role)
      const nonProduction = !isProductionRole(role)
      const skip = Array.make(testRole, nonProduction)

      if (Array.some(skip, Boolean)) {
        return emptyAdviceFindings
      }

      const callIsFiberMapApi = (call: ts.CallExpression) =>
        importedEffectApiAt(context.checker, call.expression, "FiberMap", fiberMapNames)

      const usesFiberMap = pipe(
        Option.liftPredicate(ts.isCallExpression)(node),
        Option.exists(callIsFiberMapApi)
      )

      // FiberMap is the preferred helper because its legitimate use should not be advised.
      if (usesFiberMap) {
        return emptyAdviceFindings
      }

      if (ts.isNewExpression(node)) {
        return pipe(
          newMapBindingName(node),
          Option.filter((name) => keyedMapNamePattern.test(name)),
          Option.map((name) => {
            const subject = `new Map (${name})`

            return makeAdviceFinding("keyed-stream-work")(subject)(node.expression)
          }),
          Option.map(Array.of),
          Option.getOrElse(Function.constant(emptyAdviceFindings))
        )
      }

      if (!ts.isCallExpression(node)) {
        return emptyAdviceFindings
      }

      const expression = unwrapTransparentExpression(node.expression)
      const isPropertyAccess = ts.isPropertyAccessExpression(expression)

      if (!isPropertyAccess) {
        return emptyAdviceFindings
      }

      const isSetName = strictEqual("set")(expression.name.text)

      if (!isSetName) {
        return emptyAdviceFindings
      }

      const valueOption = Option.fromNullishOr(node.arguments[1])

      if (Option.isNone(valueOption)) {
        return emptyAdviceFindings
      }

      const valueExpression = unwrapTransparentExpression(valueOption.value)

      const forksEffect = pipe(
        Option.liftPredicate(ts.isCallExpression)(valueExpression),
        Option.exists(callIsEffectApi(context.checker)("Effect")(forkValueNames))
      )

      const valueText = valueOption.value.getText()
      const valueMentionsFiber = fiberTypeNamePattern.test(valueText)
      const receiver = unwrapTransparentExpression(expression.expression)
      const receiverName = ts.isIdentifier(receiver) ? receiver.text : receiver.getText()
      const mapishReceiver = keyedReceiverPattern.test(receiverName)
      const fiberishValue = Array.make(forksEffect, valueMentionsFiber)
      const hasFiberishValue = Array.some(fiberishValue, Boolean)
      const emitParts = Array.make(mapishReceiver, hasFiberishValue)
      const emit = Array.every(emitParts, Boolean)

      if (emit) {
        const subject = `${receiverName}.set`
        const finding = makeAdviceFinding("keyed-stream-work")(subject)(node.expression)

        return Array.of(finding)
      }

      return emptyAdviceFindings
    }

  const queueConstructorNames = Array.make("make", "bounded", "unbounded", "dropping", "sliding")

  const pubSubConstructorNames = Array.make(
    "make",
    "bounded",
    "unbounded",
    "dropping",
    "sliding",
    "makeAtomicBounded",
    "makeAtomicUnbounded"
  )

  const subscriptionRefConstructorNames = Array.of("make")

  const queueConstructorSignals = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
    const queue = callIsEffectApi(checker)("Queue")(queueConstructorNames)(call)
    const pubsub = callIsEffectApi(checker)("PubSub")(pubSubConstructorNames)(call)

    const subscriptionRef = callIsEffectApi(checker)("SubscriptionRef")(
      subscriptionRefConstructorNames
    )(call)

    return Array.make(queue, pubsub, subscriptionRef)
  }

  const queueFamilyNames = Array.make("Queue", "PubSub", "SubscriptionRef", "Dequeue", "Enqueue")

  const identifierIsQueueFamily = (identifier: ts.Identifier) =>
    Array.contains(queueFamilyNames, identifier.text)

  const typeReferenceIsQueueFamily = (reference: ts.TypeReferenceNode) =>
    pipe(
      Option.liftPredicate(ts.isIdentifier)(reference.typeName),
      Option.exists(identifierIsQueueFamily)
    )

  const matchQueueFamilyNode = (current: ts.Node) =>
    pipe(
      Match.value(current),
      Match.when(ts.isIdentifier, identifierIsQueueFamily),
      Match.when(ts.isTypeReferenceNode, typeReferenceIsQueueFamily),
      Match.orElse(Function.constFalse)
    )

  const typeNodeReferencesQueueFamily = (typeNode: ts.TypeNode) => {
    const reducer = (found: boolean, current: ts.Node) => {
      const matchesQueueFamily = matchQueueFamilyNode(current)
      const signals = Array.make(found, matchesQueueFamily)

      return Array.some(signals, Boolean)
    }

    return foldAst(reducer)(typeNode)(false)
  }

  const exportedCallQueueFindings = (context: MatchContext) => (node: ts.CallExpression) => {
    const constructors = queueConstructorSignals(context.checker)(node)

    if (!Array.some(constructors, Boolean)) {
      return emptyAdviceFindings
    }

    const expressionText = node.expression.getText()
    const subject = apiSubject(context)(expressionText)(node.expression)
    const finding = makeAdviceFinding("public-queue")(subject)(node.expression)

    return Array.of(finding)
  }

  const exportedVariableTypeFindings = (node: ts.VariableDeclaration) => {
    const typeNodeOption = Option.fromNullishOr(node.type)
    const referencesQueue = pipe(typeNodeOption, Option.exists(typeNodeReferencesQueueFamily))

    if (!referencesQueue) {
      return emptyAdviceFindings
    }

    const typeNode = pipe(typeNodeOption, Option.getOrThrow)
    const typeText = typeNode.getText()

    const subject = pipe(
      Option.liftPredicate(ts.isIdentifier)(node.name),
      Option.map(Struct.get("text")),
      Option.getOrElse(Function.constant(typeText))
    )

    const finding = makeAdviceFinding("public-queue")(subject)(typeNode)

    return Array.of(finding)
  }

  const exportedVariableInitializerFindings =
    (context: MatchContext) => (node: ts.VariableDeclaration) =>
      pipe(
        Option.fromNullishOr(node.initializer),
        Option.filter(ts.isCallExpression),
        Option.flatMap((initializer) => {
          const constructors = queueConstructorSignals(context.checker)(initializer)
          const exported = isExportedDeclaration(node)
          const hasConstructor = Array.some(constructors, Boolean)
          const emitParts = Array.make(hasConstructor, exported)
          const emit = Array.every(emitParts, Boolean)

          if (!emit) {
            return Option.none()
          }

          const expressionText = initializer.expression.getText()
          const subject = apiSubject(context)(expressionText)(initializer.expression)
          const finding = makeAdviceFinding("public-queue")(subject)(initializer.expression)
          const findings = Array.of(finding)

          return Option.some(findings)
        }),
        Option.getOrElse(Function.constant(emptyAdviceFindings))
      )

  const isExportedTypeSurface = (node: ts.Node) => {
    const typeAlias = ts.isTypeAliasDeclaration(node)
    const interfaceDeclaration = ts.isInterfaceDeclaration(node)
    const typeSurface = Array.make(typeAlias, interfaceDeclaration)
    const isTypeSurface = Array.some(typeSurface, Boolean)

    return isTypeSurface ? hasExportModifier(node as ts.Statement) : isTypeSurface
  }

  const exportedTypeSurfaceFindings = (node: ts.Node) => {
    const matchCurrent = (current: ts.Node) => {
      const isType = ts.isTypeNode(current)

      return isType ? typeNodeReferencesQueueFamily(current) : isType
    }

    const referencesQueueReducer = (found: boolean, current: ts.Node) => {
      const matchesCurrent = matchCurrent(current)
      const signals = Array.make(found, matchesCurrent)

      return Array.some(signals, Boolean)
    }

    const referencesQueue = foldAst(referencesQueueReducer)(node)(false)

    if (!referencesQueue) {
      return emptyAdviceFindings
    }

    const nodeText = node.getText()

    const namedDeclaration = pipe(
      Option.liftPredicate(ts.isTypeAliasDeclaration)(node),
      Option.orElse(() => Option.liftPredicate(ts.isInterfaceDeclaration)(node))
    )

    const subject = pipe(
      namedDeclaration,
      Option.flatMap(declarationNameText),
      Option.getOrElse(Function.constant(nodeText))
    )

    const finding = makeAdviceFinding("public-queue")(subject)(node)

    return Array.of(finding)
  }

  const publicQueue =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.Node): ReadonlyArray<EffectQualityAdviceFinding> => {
      // Ports already forbid infrastructure contracts via because other public surfaces need advice.
      const isPort = strictEqual("port")(role)
      const testRole = isTestRole(role)
      const nonProduction = !isProductionRole(role)
      const skipRoles = Array.make(isPort, testRole, nonProduction)

      if (Array.some(skipRoles, Boolean)) {
        return emptyAdviceFindings
      }

      const exportedCallFindings = pipe(
        Option.liftPredicate(ts.isCallExpression)(node),
        Option.filter(isExportedDeclaration),
        Option.map(exportedCallQueueFindings(context)),
        Option.getOrElse(Function.constant(emptyAdviceFindings))
      )

      if (exportedCallFindings.length > 0) {
        return exportedCallFindings
      }

      // Exported type annotations expose queue family because callers couple to infrastructure.
      const exportedVariableFindings = pipe(
        Option.liftPredicate(ts.isVariableDeclaration)(node),
        Option.filter(isExportedDeclaration),
        Option.map((variable) => {
          const typeFindings = exportedVariableTypeFindings(variable)

          return typeFindings.length > 0
            ? typeFindings
            : exportedVariableInitializerFindings(context)(variable)
        }),
        Option.getOrElse(Function.constant(emptyAdviceFindings))
      )

      if (exportedVariableFindings.length > 0) {
        return exportedVariableFindings
      }

      return isExportedTypeSurface(node) ? exportedTypeSurfaceFindings(node) : emptyAdviceFindings
    }

  const effectQualityStateFindings = (
    context: MatchContext,
    _index: EffectQualityIndex,
    role: ArchitectureRole,
    node: ts.Node
  ): ReadonlyArray<EffectQualityAdviceFinding> => {
    const callCacheFindings = ts.isCallExpression(node)
      ? cachePreference(context)(role)(node)
      : emptyAdviceFindings

    const callQueueFindings = ts.isCallExpression(node)
      ? publicQueue(context)(role)(node)
      : emptyAdviceFindings

    const callKeyedFindings = ts.isCallExpression(node)
      ? keyedStreamWork(context)(role)(node)
      : emptyAdviceFindings

    const callGroups = Array.make(callCacheFindings, callQueueFindings, callKeyedFindings)
    const callFindings = Array.flatten(callGroups)

    const newCacheFindings = ts.isNewExpression(node)
      ? cachePreference(context)(role)(node)
      : emptyAdviceFindings

    const newKeyedFindings = ts.isNewExpression(node)
      ? keyedStreamWork(context)(role)(node)
      : emptyAdviceFindings

    const newFindings = Array.appendAll(newCacheFindings, newKeyedFindings)
    const declarationFindings = publicQueue(context)(role)(node)
    const findingGroups = Array.make(callFindings, newFindings, declarationFindings)

    return Array.flatten(findingGroups)
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

    const reducer = (found: boolean, current: ts.Node) => {
      const hasPageToken = pageTokenNode(current)
      const signals = Array.make(found, hasPageToken)

      return Array.some(signals, Boolean)
    }

    return foldAst(reducer)(node)(false)
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
    const reducer = (found: boolean, current: ts.Node) => {
      const accumulates = pageAccumulateNode(current)
      const signals = Array.make(found, accumulates)

      return Array.some(signals, Boolean)
    }

    return foldAst(reducer)(node)(false)
  }

  const streamPagination =
    (context: MatchContext) =>
    (role: ArchitectureRole) =>
    (node: ts.Node): ReadonlyArray<EffectQualityAdviceFinding> => {
      const testRole = isTestRole(role)
      const nonProduction = !isProductionRole(role)
      const skip = Array.make(testRole, nonProduction)

      if (Array.some(skip, Boolean)) {
        return emptyAdviceFindings
      }

      const pageTokenLoop = isPageTokenLoop(node)
      const accumulates = loopAccumulatesPages(node)
      const eligible = Array.make(pageTokenLoop, accumulates)

      if (!Array.every(eligible, Boolean)) {
        return emptyAdviceFindings
      }

      // Stay quiet when Stream.paginate is already chosen because the preferred API is present.
      const usesPaginateReducer = (found: boolean, current: ts.Node) => {
        const isCall = ts.isCallExpression(current)

        const isPaginateCall =
          isCall && callIsEffectApi(context.checker)("Stream")(streamPaginateNames)(current)

        const signals = Array.make(found, isPaginateCall)

        return Array.some(signals, Boolean)
      }

      const scan = Function.flip(foldAst(usesPaginateReducer))(false)
      const usesPaginate = pipe(enclosingFunctionLike(node), Option.exists(scan))

      if (usesPaginate) {
        return emptyAdviceFindings
      }

      const finding = makeAdviceFinding("stream-pagination")("page-token loop")(node)

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
    (role: ArchitectureRole) =>
    (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
      // Map adapter/app failures to domain errors because callers need typed boundaries.
      const isAdapter = strictEqual("adapter")(role)
      const isApplication = strictEqual("application")(role)
      const allowed = Array.make(isAdapter, isApplication)

      if (!Array.some(allowed, Boolean)) {
        return emptyAdviceFindings
      }

      const catchAllCall = callIsEffectApi(context.checker)("Effect")(catchAllNames)(node)
      const catchCauseCall = callIsEffectApi(context.checker)("Effect")(catchCauseNames)(node)
      const catchAllParts = Array.make(catchAllCall, catchCauseCall)
      const catchAll = Array.some(catchAllParts, Boolean)

      if (!catchAll) {
        return emptyAdviceFindings
      }

      const handlerOption = pipe(
        Option.fromNullishOr(node.arguments[1]),
        Option.orElse(() => Option.fromNullishOr(node.arguments[0]))
      )

      if (Option.isNone(handlerOption)) {
        return emptyAdviceFindings
      }

      // Stay quiet when the handler already because mapping is present.
      const mapsTaggedErrorReducer = (found: boolean, current: ts.Node) => {
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

      const mapsTaggedError = foldAst(mapsTaggedErrorReducer)(handlerOption.value)(false)

      // Only flag handlers that rethrow or return raw Error because that skips domain mapping.
      const returnsRawErrorReducer = (found: boolean, current: ts.Node) => {
        const rawError = pipe(
          EffectMatch.value(current),
          EffectMatch.when(ts.isThrowStatement, Function.constTrue),
          EffectMatch.when(ts.isNewExpression, isRawErrorConstruction),
          EffectMatch.orElse(Function.constFalse)
        )

        const signals = Array.make(found, rawError)

        return Array.some(signals, Boolean)
      }

      const returnsRawError = foldAst(returnsRawErrorReducer)(handlerOption.value)(false)
      const mapsWithoutRawParts = Array.make(mapsTaggedError, !returnsRawError)
      const mapsWithoutRaw = Array.every(mapsWithoutRawParts, Boolean)
      const quiet = Array.make(mapsWithoutRaw, !returnsRawError)

      if (Array.some(quiet, Boolean)) {
        return emptyAdviceFindings
      }

      const expressionText = node.expression.getText()
      const subject = apiSubject(context)(expressionText)(node.expression)
      const finding = makeAdviceFinding("typed-boundary-error")(subject)(node.expression)

      return Array.of(finding)
    }

  const effectQualityStreamAndRecoveryFindings = (
    context: MatchContext,
    _index: EffectQualityIndex,
    role: ArchitectureRole,
    node: ts.Node
  ): ReadonlyArray<EffectQualityAdviceFinding> => {
    const typedBoundary = ts.isCallExpression(node)
      ? typedBoundaryError(context)(role)(node)
      : emptyAdviceFindings

    const pagination = streamPagination(context)(role)(node)

    return Array.appendAll(typedBoundary, pagination)
  }

  const evidenceFindings = Array.make(
    effectQualityRuntimeFindings,
    effectQualityStateFindings,
    effectQualityStreamAndRecoveryFindings
  )

  type RuntimeRuleFindings = typeof runtimeRuleFindings
  type RuntimeEvidenceFindings = typeof evidenceFindings

  class EffectQualityRuntimeFeature {
    constructor(
      readonly ruleFindings: RuntimeRuleFindings,
      readonly evidenceFindings: RuntimeEvidenceFindings
    ) {}
  }

  return new EffectQualityRuntimeFeature(runtimeRuleFindings, evidenceFindings)
}

export const effectQualityRuntimeFeature = makeEffectQualityRuntimeFeature()
