import { Array, Data, Function, HashSet, Option, Tuple, pipe, Match as EffectMatch } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { Match as FactMatch } from "../../matcher/match.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { Subscription } from "../../matcher/subscription.js"
import { fileSubscriptions } from "../../matcher/fileSubscriptions.js"
import { nodeSubscriptions } from "../../matcher/nodeSubscriptions.js"
import { foldAst } from "../../sources/foldAst.js"
import { FunctionalCoreShapeData } from "./shapeData.js"
import type { FunctionalCoreBoundaryData } from "./boundaryData.js"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"
import { roleForSourceFile } from "./roleForSourceFile.js"
import { declarationIsContextReference } from "./contextReferenceNames.js"
import { declarationIsContextService } from "./declarationIsContextService.js"
import { effectServiceConfigObject } from "./effectServiceConfigObject.js"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"
import { importedMemberAt } from "./importedMemberAt.js"
import { importedEffectApiAt } from "./importedEffectApiAt.js"
import { specifierIsEffect } from "./specifierIsEffect.js"
import { propertyAssignmentNamed } from "./propertyAssignments.js"
import { isRuntimeFunctionLike } from "./isRuntimeFunctionLike.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { makeNodeMatch } from "../../matcher/makeNodeMatch.js"
import { isExpressionBody } from "../../support/isExpressionBody.js"
import { singleStatementReturnExpression } from "../../support/singleStatementReturnExpression.js"
import { enclosingFunctionLike } from "./enclosingFunctionLike.js"
import { callIsPipeRuntimeHandoff } from "./effectRuntimeApis.js"
import { isManagedRuntimeMethodAccess } from "./managedRuntimeMethodAccess.js"

const makeOrchestrationShapeFeature = () => {
  class FileShapeMetrics extends Data.Class<{
    readonly branchCount: number
    readonly functionCount: number
  }> {}

  const emptyFileShapeMetrics = new FileShapeMetrics({ branchCount: 0, functionCount: 0 })

  class OrchestratorMetrics extends Data.Class<{
    readonly branchCount: number
    readonly yieldCount: number
    readonly transformationCount: number
    readonly serviceNames: ReadonlyArray<string>
  }> {}

  class ServiceSurfaceMetrics extends Data.Class<{
    readonly functionCount: number
    readonly nonFunctionCount: number
    readonly effectfulMemberCount: number
  }> {}

  const resultExpressionFromBody = (bodyNode: ts.ConciseBody) =>
    isExpressionBody(bodyNode) ? Option.some(bodyNode) : singleStatementReturnExpression(bodyNode)

  const functionResultExpression = (node: ts.FunctionLikeDeclaration) => {
    const body = Option.fromNullishOr(node.body)

    return Option.flatMap(body, resultExpressionFromBody)
  }

  const isBranchNode = (node: ts.Node) => {
    const isIf = ts.isIfStatement(node)
    const isSwitch = ts.isSwitchStatement(node)
    const isConditional = ts.isConditionalExpression(node)
    const checks = Array.make(isIf, isSwitch, isConditional)

    return Array.some(checks, Boolean)
  }

  const isOwnedByFunction = (node: ts.Node, owner: ts.FunctionLikeDeclaration) => {
    const declarationIsOwner = strictEqual(owner)

    return pipe(enclosingFunctionLike(node), Option.exists(declarationIsOwner))
  }

  const compositionLayerNames = Array.make(
    "effect",
    "effectDiscard",
    "effectContext",
    "succeed",
    "provide",
    "provideMerge"
  )

  const compositionEffectNames = Array.make(
    "provide",
    "provideService",
    "provideServiceEffect",
    "provideContext",
    "runCallback",
    "runFork",
    "runPromise",
    "runPromiseExit",
    "runSync",
    "runSyncExit",
    "runCallbackWith",
    "runForkWith",
    "runPromiseWith",
    "runPromiseExitWith",
    "runSyncWith",
    "runSyncExitWith"
  )

  const compositionRuntimeNames = Array.make(
    "runCallback",
    "runFork",
    "runPromise",
    "runPromiseExit",
    "runSync",
    "runSyncExit",
    "runCallbackWith",
    "runForkWith",
    "runPromiseWith",
    "runPromiseExitWith",
    "runSyncWith",
    "runSyncExitWith"
  )

  const managedRuntimeMakeNames = Array.of("make")

  const callIsRecognizedCompositionApi = (checker: ts.TypeChecker, node: ts.CallExpression) => {
    const layer = importedEffectApiAt(checker, node.expression, "Layer", compositionLayerNames)
    const effect = importedEffectApiAt(checker, node.expression, "Effect", compositionEffectNames)

    const managedRuntimeMake = importedEffectApiAt(
      checker,
      node.expression,
      "ManagedRuntime",
      managedRuntimeMakeNames
    )

    const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(node.expression)

    const isManagedRuntimeMethod = (expression: ts.PropertyAccessExpression) =>
      isManagedRuntimeMethodAccess(checker, expression, compositionRuntimeNames)

    const managedRuntimeMethod = Option.exists(propertyAccess, isManagedRuntimeMethod)
    const pipeRuntimeHandoff = callIsPipeRuntimeHandoff(checker, node, compositionRuntimeNames)

    const runMain = pipe(
      importedMemberAt(checker, node.expression),
      Option.exists((member) => {
        const lastOption = Array.last(member.path)
        const name = pipe(lastOption, Option.getOrElse(Function.constant("")))
        const platformNode = member.moduleSpecifier.startsWith("@effect/platform-node")
        const platformBun = member.moduleSpecifier.startsWith("@effect/platform-bun")
        const platformDeno = member.moduleSpecifier.startsWith("@effect/platform-deno")
        const platformBrowser = member.moduleSpecifier.startsWith("@effect/platform-browser")
        const platformFlags = Array.make(platformNode, platformBun, platformDeno, platformBrowser)
        const platformRuntime = Array.some(platformFlags, Boolean)
        const isRunMain = strictEqual("runMain")(name)
        const runMainFlags = Array.make(platformRuntime, isRunMain)

        return Array.every(runMainFlags, Boolean)
      })
    )

    const checks = Array.make(
      layer,
      effect,
      managedRuntimeMake,
      managedRuntimeMethod,
      pipeRuntimeHandoff,
      runMain
    )

    return Array.some(checks, Boolean)
  }

  const shapeDetection = (_context: MatchContext, node: ts.Node, data: FunctionalCoreShapeData) =>
    makeNodeMatch(node, data)

  const expressionIsServiceTag = (checker: ts.TypeChecker, expression: ts.Expression) => {
    const declarationIsContextServiceOf = (declaration: ts.Declaration) =>
      declarationIsContextService(checker, declaration) ||
      declarationIsContextReference(checker, declaration)

    const someContextServiceDeclaration = (declarations: ReadonlyArray<ts.Declaration>) =>
      Array.some(declarations, declarationIsContextServiceOf)

    const resolvedSymbolAtNode = (node: ts.Node) =>
      pipe(
        checker.getSymbolAtLocation(node),
        Option.fromNullishOr,
        Option.map((symbol) => {
          const alias = (symbol.flags & ts.SymbolFlags.Alias) !== 0
          return alias ? checker.getAliasedSymbol(symbol) : symbol
        })
      )

    return pipe(
      expression,
      unwrapTransparentExpression,
      resolvedSymbolAtNode,
      Option.map(declarationsOfSymbol),
      Option.exists(someContextServiceDeclaration)
    )
  }

  const emptyServiceNames: ReadonlyArray<string> = Array.empty()

  const emptyOrchestratorMetrics = new OrchestratorMetrics({
    branchCount: 0,
    yieldCount: 0,
    transformationCount: 0,
    serviceNames: emptyServiceNames
  })

  const emptyServiceSurfaceMetrics = new ServiceSurfaceMetrics({
    functionCount: 0,
    nonFunctionCount: 0,
    effectfulMemberCount: 0
  })

  const effectControlRuntimeNamespaces = HashSet.make(
    "Effect",
    "Layer",
    "Context",
    "Stream",
    "Sink",
    "Channel",
    "Ref",
    "SynchronizedRef",
    "Queue",
    "PubSub",
    "SubscriptionRef",
    "References",
    "Runtime",
    "ManagedRuntime",
    "Scope",
    "Schedule",
    "Fiber",
    "Deferred",
    "Cause",
    "Exit",
    "Latch",
    "Semaphore"
  )

  const nestedBeneathYield = (node: ts.Node, owner: ts.FunctionLikeDeclaration) => {
    const visit = (current: ts.Node): boolean => {
      const atOwner = strictEqual(owner)(current)
      const atBody = strictEqual(owner.body)(current)
      const boundaryFlags = Array.make(atOwner, atBody)
      const atBoundary = Array.some(boundaryFlags, Boolean)
      const isFalse = strictEqual(false)
      return pipe(
        Option.liftPredicate(isFalse)(atBoundary),
        Option.map(() => {
          const isYield = ts.isYieldExpression(current)
          const parentNested = pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
          const yieldFlags = Array.make(isYield, parentNested)

          return Array.some(yieldFlags, Boolean)
        }),
        Option.getOrElse(Function.constFalse)
      )
    }

    return pipe(Option.fromNullishOr(node.parent), Option.exists(visit))
  }

  const namespaceIsEffectControlRuntime = (namespace: string) =>
    HashSet.has(effectControlRuntimeNamespaces, namespace)

  const effectSubpathNamespace = (specifier: string) => {
    const effectPath = specifier.slice("effect/".length)
    const segments = effectPath.split("/")

    return Array.get(segments, 0)
  }

  const callOwnedByEffectControlRuntime = (checker: ts.TypeChecker, node: ts.CallExpression) =>
    pipe(
      importedMemberAt(checker, node.expression),
      Option.exists((member) => {
        const pathHead = Array.get(member.path, 0)
        const keepPathHead = Function.constant(pathHead)

        const fromSubpath = pipe(
          Option.liftPredicate((specifier: string) => specifier.startsWith("effect/"))(
            member.moduleSpecifier
          ),
          Option.flatMap(effectSubpathNamespace),
          Option.exists(namespaceIsEffectControlRuntime)
        )

        const fromBarrel = pipe(
          Option.liftPredicate(specifierIsEffect)(member.moduleSpecifier),
          Option.flatMap(keepPathHead),
          Option.exists(namespaceIsEffectControlRuntime)
        )

        const runtimeFlags = Array.make(fromSubpath, fromBarrel)

        return Array.some(runtimeFlags, Boolean)
      })
    )

  const isQualifyingTransformationCall = (
    context: MatchContext,
    owner: ts.FunctionLikeDeclaration,
    node: ts.CallExpression
  ) => {
    const owned = isOwnedByFunction(node, owner)
    const nested = nestedBeneathYield(node, owner)
    const notNested = strictEqual(false)(nested)
    const continueFlags = Array.make(owned, notNested)
    const continues = Array.every(continueFlags, Boolean)
    const ownedByRuntime = callOwnedByEffectControlRuntime(context.checker, node)
    const external = strictEqual(false)(ownedByRuntime)
    const continueExternalFlags = Array.make(continues, external)

    return Array.every(continueExternalFlags, Boolean)
  }

  const nestedInRecognizedCompositionApi = (checker: ts.TypeChecker, node: ts.Node) => {
    const callIsRecognizedComposition = (call: ts.CallExpression) =>
      callIsRecognizedCompositionApi(checker, call)

    const visit = (current: ts.Node): boolean => {
      const matchingCall = pipe(
        Option.liftPredicate(ts.isCallExpression)(current),
        Option.exists(callIsRecognizedComposition)
      )

      const parentNested = pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
      const nestedFlags = Array.make(matchingCall, parentNested)

      return Array.some(nestedFlags, Boolean)
    }

    return pipe(Option.fromNullishOr(node.parent), Option.exists(visit))
  }

  const addServiceName = (names: ReadonlyArray<string>, name: string): ReadonlyArray<string> =>
    Array.contains(names, name) ? names : Array.append(names, name)

  const serviceYieldName = (checker: ts.TypeChecker, node: ts.YieldExpression) => {
    const expressionIsServiceTagCheck = (expr: ts.Expression) =>
      expressionIsServiceTag(checker, expr)

    return pipe(
      Option.fromNullishOr(node.asteriskToken),
      Option.flatMap(() => Option.fromNullishOr(node.expression)),
      Option.filter(expressionIsServiceTagCheck),
      Option.map((expr) => expr.getText())
    )
  }

  const collectOrchestratorMetrics = (context: MatchContext, owner: ts.FunctionLikeDeclaration) => {
    const root = pipe(Option.fromNullishOr(owner.body), Option.getOrElse(Function.constant(owner)))
    const nodeIsOwnedByFunction = (candidate: ts.Node) => isOwnedByFunction(candidate, owner)

    const reduceOrchestratorMetrics = (metrics: typeof emptyOrchestratorMetrics, node: ts.Node) => {
      const qualifyingCallMetrics = (call: ts.CallExpression) =>
        isQualifyingTransformationCall(context, owner, call)
          ? new OrchestratorMetrics({
              ...metrics,
              transformationCount: metrics.transformationCount + 1
            })
          : metrics

      const yieldServiceMetrics = (yieldNode: ts.YieldExpression) =>
        pipe(
          serviceYieldName(context.checker, yieldNode),
          Option.map((text) => {
            const serviceNames = addServiceName(metrics.serviceNames, text)

            return new OrchestratorMetrics({
              ...metrics,
              yieldCount: metrics.yieldCount + 1,
              serviceNames
            })
          }),
          Option.getOrElse(Function.constant(metrics))
        )

      const pipeOf = (ownedNode: ts.Node) =>
        pipe(
          EffectMatch.value(ownedNode),
          EffectMatch.when(
            isBranchNode,
            () =>
              new OrchestratorMetrics({
                ...metrics,
                branchCount: metrics.branchCount + 1
              })
          ),
          EffectMatch.when(ts.isCallExpression, qualifyingCallMetrics),
          EffectMatch.when(ts.isYieldExpression, yieldServiceMetrics),
          EffectMatch.orElse(Function.constant(metrics))
        )

      return pipe(
        Option.liftPredicate(nodeIsOwnedByFunction)(node),
        Option.map(pipeOf),
        Option.getOrElse(Function.constant(metrics))
      )
    }

    return foldAst(reduceOrchestratorMetrics)(root)(emptyOrchestratorMetrics)
  }

  const isOrchestratorFunctionArgument = (
    argument: ts.Expression
  ): argument is ts.ArrowFunction | ts.FunctionExpression => {
    const isArrow = ts.isArrowFunction(argument)
    const isFunction = ts.isFunctionExpression(argument)
    const functionFlags = Array.make(isArrow, isFunction)

    return Array.some(functionFlags, Boolean)
  }

  const orchestratorDefinition = (node: ts.CallExpression) =>
    Array.findFirst(node.arguments, isOrchestratorFunctionArgument)

  const callIsEffectOrchestrator = (context: MatchContext, node: ts.CallExpression) => {
    const callee = unwrapCallee(node.expression)
    const names = Array.make("gen", "fn", "fnUntraced")

    return importedEffectApiAt(context.checker, callee, "Effect", names)
  }

  const orchestratorElements =
    (index: FunctionalCoreEffectIndex) =>
    (context: MatchContext) =>
    (node: ts.CallExpression): ReadonlyArray<FactMatch<FunctionalCoreShapeData>> => {
      const role = roleForSourceFile(index, context.sourceFile)
      const roleIsApplication = strictEqual("application")
      const applicationRole = Option.exists(role, roleIsApplication)
      const isOrchestrator = callIsEffectOrchestrator(context, node)
      const relevantFlags = Array.make(applicationRole, isOrchestrator)
      const relevant = Array.every(relevantFlags, Boolean)

      return relevant
        ? pipe(
            orchestratorDefinition(node),
            Option.map((owner) => {
              const metrics = collectOrchestratorMetrics(context, owner)
              const hasSeveralServices = metrics.serviceNames.length >= 2
              const hasSeveralBranches = metrics.branchCount >= 2
              const hasSeveralTransformations = metrics.transformationCount >= 3

              const branchTransformationFlags = Array.make(
                hasSeveralBranches,
                hasSeveralTransformations
              )

              const branchOrTransformation = Array.some(branchTransformationFlags, Boolean)
              const qualifyFlags = Array.make(hasSeveralServices, branchOrTransformation)
              const qualifies = Array.every(qualifyFlags, Boolean)

              const data = FunctionalCoreShapeData.make({
                kind: "effect-orchestrator",
                role: "application",
                branchCount: metrics.branchCount,
                functionCount: 1,
                serviceCount: metrics.serviceNames.length,
                effectfulMemberCount: metrics.yieldCount,
                transformationCount: metrics.transformationCount
              })

              const element = shapeDetection(context, owner, data)
              const detections = Array.of(element)

              return qualifies ? detections : Array.empty<FactMatch<FunctionalCoreShapeData>>()
            }),
            Option.getOrElse(Array.empty<FactMatch<FunctionalCoreShapeData>>)
          )
        : Array.empty()
    }

  const functionReturnsComposition = (
    checker: ts.TypeChecker,
    node: ts.FunctionLikeDeclaration
  ) => {
    const callIsRecognized = (call: ts.CallExpression) =>
      callIsRecognizedCompositionApi(checker, call)

    const expressionIsRecognizedComposition = (expression: ts.Expression) =>
      pipe(Option.liftPredicate(ts.isCallExpression)(expression), Option.exists(callIsRecognized))

    return pipe(
      functionResultExpression(node),
      Option.map(unwrapTransparentExpression),
      Option.exists(expressionIsRecognizedComposition)
    )
  }

  const collectFileShape = (context: MatchContext, role: ArchitectureRole) => {
    const functionReturnsCompositionCheck = (fn: ts.FunctionLikeDeclaration) =>
      functionReturnsComposition(context.checker, fn)

    const reduceFileShapeMetrics = (metrics: typeof emptyFileShapeMetrics, node: ts.Node) => {
      const isRoot = strictEqual("root")(role)
      const nestedInComposition = nestedInRecognizedCompositionApi(context.checker, node)
      const nestedCompositionFlags = Array.make(isRoot, nestedInComposition)
      const nestedComposition = Array.every(nestedCompositionFlags, Boolean)
      const isRuntimeFunction = isRuntimeFunctionLike(node)

      const returnsComposition = pipe(
        Option.liftPredicate(isRuntimeFunctionLike)(node),
        Option.exists(functionReturnsCompositionCheck)
      )

      const returnedCompositionFlags = Array.make(isRoot, isRuntimeFunction, returnsComposition)
      const returnedComposition = Array.every(returnedCompositionFlags, Boolean)
      const excludeCompositionFlags = Array.make(nestedComposition, returnedComposition)
      const excludeComposition = Array.some(excludeCompositionFlags, Boolean)

      return excludeComposition
        ? metrics
        : pipe(
            EffectMatch.value(node),
            EffectMatch.when(
              isBranchNode,
              () =>
                new FileShapeMetrics({
                  ...metrics,
                  branchCount: metrics.branchCount + 1
                })
            ),
            EffectMatch.when(
              isRuntimeFunctionLike,
              () =>
                new FileShapeMetrics({
                  ...metrics,
                  functionCount: metrics.functionCount + 1
                })
            ),
            EffectMatch.orElse(Function.constant(metrics))
          )
    }

    return foldAst(reduceFileShapeMetrics)(context.sourceFile)(emptyFileShapeMetrics)
  }

  const fileShapeData = (
    role: ArchitectureRole,
    metrics: typeof emptyFileShapeMetrics
  ): Option.Option<FunctionalCoreShapeData> => {
    const isAdapter = strictEqual("adapter")(role)
    const adapterBranches = metrics.branchCount >= 3
    const adapterFunctions = metrics.functionCount >= 2
    const adapterEvidenceFlags = Array.make(isAdapter, adapterBranches, adapterFunctions)
    const adapterEvidence = Array.every(adapterEvidenceFlags, Boolean)
    const isRoot = strictEqual("root")(role)
    const rootBranches = metrics.branchCount >= 2
    const rootFunctions = metrics.functionCount >= 2
    const rootVolumeFlags = Array.make(rootBranches, rootFunctions)
    const rootVolume = Array.some(rootVolumeFlags, Boolean)
    const rootEvidenceFlags = Array.make(isRoot, rootVolume)
    const rootEvidence = Array.every(rootEvidenceFlags, Boolean)
    const evidenceFlags = Array.make(adapterEvidence, rootEvidence)
    const hasEvidence = Array.some(evidenceFlags, Boolean)
    const kind = adapterEvidence ? "adapter-business-logic" : "thick-composition-root"

    const data = FunctionalCoreShapeData.make({
      kind,
      role,
      branchCount: metrics.branchCount,
      functionCount: metrics.functionCount,
      serviceCount: 0,
      effectfulMemberCount: 0,
      transformationCount: 0
    })

    return hasEvidence ? Option.some(data) : Option.none()
  }

  const fileShapeElements =
    (index: FunctionalCoreEffectIndex) =>
    (context: MatchContext): ReadonlyArray<FactMatch<FunctionalCoreShapeData>> => {
      const shapeDetectionOf = (data: FunctionalCoreShapeData) =>
        shapeDetection(context, context.sourceFile, data)

      return pipe(
        roleForSourceFile(index, context.sourceFile),
        Option.filter((role) => {
          const isAdapter = strictEqual("adapter")(role)
          const isRoot = strictEqual("root")(role)
          const roleFlags = Array.make(isAdapter, isRoot)

          return Array.some(roleFlags, Boolean)
        }),
        Option.flatMap((role) => {
          const metrics = collectFileShape(context, role)

          return fileShapeData(role, metrics)
        }),
        Option.map(shapeDetectionOf),
        Option.toArray
      )
    }

  const findContextTagTypeArgument = (expression: ts.Expression): Option.Option<ts.TypeNode> =>
    pipe(
      Option.liftPredicate(ts.isCallExpression)(expression),
      Option.flatMap((call) => {
        const arguments_ = pipe(
          Option.fromNullishOr(call.typeArguments),
          Option.getOrElse(Array.empty)
        )

        const second = Array.get(arguments_, 1)

        return Option.orElse(second, () => findContextTagTypeArgument(call.expression))
      })
    )

  const findContextTagTypeArgumentOf = (heritage: ts.ExpressionWithTypeArguments) =>
    findContextTagTypeArgument(heritage.expression)

  const contextServiceTypeNode = (context: MatchContext, declaration: ts.ClassDeclaration) => {
    const serviceNames = Array.of("Service")
    const heritageTypesOf = (clause: ts.HeritageClause) => Array.fromIterable(clause.types)
    return pipe(
      Option.fromNullishOr(declaration.heritageClauses),
      Option.getOrElse(Array.empty),
      Array.flatMap(heritageTypesOf),
      Array.findFirst((heritage) => {
        const callee = unwrapCallee(heritage.expression)

        return importedEffectApiAt(context.checker, callee, "Context", serviceNames)
      }),
      Option.flatMap(findContextTagTypeArgumentOf)
    )
  }

  const isObjectFactoryFunction = (
    expression: ts.Expression
  ): expression is ts.ArrowFunction | ts.FunctionExpression => {
    const isArrow = ts.isArrowFunction(expression)
    const isFunction = ts.isFunctionExpression(expression)
    const functionFlags = Array.make(isArrow, isFunction)

    return Array.some(functionFlags, Boolean)
  }

  const objectReturnedBy = (expression: ts.Expression) => {
    const unwrapped = unwrapTransparentExpression(expression)
    const asObject = Option.liftPredicate(ts.isObjectLiteralExpression)(unwrapped)

    const asFunction = pipe(
      Option.liftPredicate(isObjectFactoryFunction)(unwrapped),
      Option.flatMap(functionResultExpression),
      Option.map(unwrapTransparentExpression),
      Option.filter(ts.isObjectLiteralExpression)
    )

    return pipe(asObject, Option.orElse(Function.constant(asFunction)))
  }

  const effectSucceedSyncNames = Array.make("succeed", "sync")
  const effectMakeNames = Array.of("make")

  const pipeOf3 = (call: ts.CallExpression) =>
    pipe(Array.head(call.arguments), Option.flatMap(objectReturnedBy))

  const effectWrappedServiceObject = (context: MatchContext, expression: ts.Expression) => {
    const importedEffectApiAtOf = (call: ts.CallExpression) =>
      importedEffectApiAt(context.checker, call.expression, "Effect", effectSucceedSyncNames)

    return pipe(
      expression,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isCallExpression),
      Option.filter(importedEffectApiAtOf),
      Option.flatMap(pipeOf3)
    )
  }

  const effectServiceObject = (context: MatchContext, declaration: ts.ClassDeclaration) => {
    const effectWrappedServiceObjectOf = (property: ts.ObjectLiteralElementLike) =>
      ts.isPropertyAssignment(property)
        ? effectWrappedServiceObject(context, property.initializer)
        : Option.none()

    const pipeOf4 = (config: ts.ObjectLiteralExpression) =>
      pipe(
        propertyAssignmentNamed(config, effectMakeNames),
        Option.flatMap(effectWrappedServiceObjectOf)
      )

    return pipe(effectServiceConfigObject(context.checker, declaration), Option.flatMap(pipeOf4))
  }

  const typeLooksEffectful = (checker: ts.TypeChecker, type: ts.Type) => {
    const rendered = checker.typeToString(type)

    const markers = Array.make(
      "Effect<",
      "Stream<",
      "Channel<",
      "Sink<",
      "Ref<",
      "Queue<",
      "PubSub<"
    )

    return Array.some(markers, (marker) => rendered.includes(marker))
  }

  const serviceSurfaceMetrics = (checker: ts.TypeChecker, type: ts.Type, location: ts.Node) => {
    const properties = type.getProperties()

    return Array.reduce(properties, emptyServiceSurfaceMetrics, (metrics, property) => {
      const propertyType = checker.getTypeOfSymbolAtLocation(property, location)
      const signatures = propertyType.getCallSignatures()
      const isNonFunction = strictEqual(0)(signatures.length)

      const effectful = Array.some(signatures, (signature) => {
        const returnType = signature.getReturnType()

        return typeLooksEffectful(checker, returnType)
      })

      const nonFunctionMetrics = new ServiceSurfaceMetrics({
        ...metrics,
        nonFunctionCount: metrics.nonFunctionCount + 1
      })

      const functionMetrics = new ServiceSurfaceMetrics({
        functionCount: metrics.functionCount + 1,
        nonFunctionCount: metrics.nonFunctionCount,
        effectfulMemberCount: metrics.effectfulMemberCount + (effectful ? 1 : 0)
      })

      return isNonFunction ? nonFunctionMetrics : functionMetrics
    })
  }

  const pureServiceElements =
    (index: FunctionalCoreEffectIndex) =>
    (context: MatchContext) =>
    (node: ts.ClassDeclaration): ReadonlyArray<FactMatch<FunctionalCoreShapeData>> => {
      const role = roleForSourceFile(index, context.sourceFile)

      const relevantRole = pipe(
        role,
        Option.filter((value) => {
          const isPort = strictEqual("port")(value)
          const isApplication = strictEqual("application")(value)
          const roleFlags = Array.make(isPort, isApplication)

          return Array.some(roleFlags, Boolean)
        })
      )

      return Option.match(relevantRole, {
        onNone: () => Array.empty(),
        onSome: (role) =>
          pipe(
            pipe(
              contextServiceTypeNode(context, node),
              Option.map((typeNode) => {
                const type = context.checker.getTypeFromTypeNode(typeNode)

                return Tuple.make(type, typeNode)
              }),
              Option.orElse(() =>
                pipe(
                  effectServiceObject(context, node),
                  Option.map((object) => {
                    const type = context.checker.getTypeAtLocation(object)

                    return Tuple.make(type, object)
                  })
                )
              )
            ),
            Option.map(([type, location]) =>
              serviceSurfaceMetrics(context.checker, type, location)
            ),
            Option.filter((metrics) => {
              const hasFunctions = metrics.functionCount > 0
              const allFunctions = strictEqual(0)(metrics.nonFunctionCount)
              const allPure = strictEqual(0)(metrics.effectfulMemberCount)
              const purityFlags = Array.make(hasFunctions, allFunctions, allPure)

              return Array.every(purityFlags, Boolean)
            }),
            Option.map((metrics) => {
              const data = FunctionalCoreShapeData.make({
                kind: "pure-service",
                role,
                branchCount: 0,
                functionCount: metrics.functionCount,
                serviceCount: 1,
                effectfulMemberCount: metrics.effectfulMemberCount,
                transformationCount: 0
              })

              const target = pipe(
                Option.fromNullishOr(node.name),
                Option.getOrElse(Function.constant(node))
              )

              return shapeDetection(context, target, data)
            }),
            Option.toArray
          )
      })
    }

  const callKinds = Array.of(ts.SyntaxKind.CallExpression)
  const classKinds = Array.of(ts.SyntaxKind.ClassDeclaration)

  const shapeSubscriptionsFor = (
    index: FunctionalCoreEffectIndex
  ): ReadonlyArray<Subscription<FunctionalCoreShapeData>> => {
    const orchestratorSubscriptions = nodeSubscriptions(callKinds)(ts.isCallExpression)(
      orchestratorElements(index)
    )

    const serviceSubscriptions = nodeSubscriptions(classKinds)(ts.isClassDeclaration)(
      pureServiceElements(index)
    )

    const fileShapeSubscriptions = fileSubscriptions(fileShapeElements(index))

    const subscriptions = Array.make(
      orchestratorSubscriptions,
      serviceSubscriptions,
      fileShapeSubscriptions
    )

    return Array.flatten(subscriptions)
  }

  const emptyBoundaryFacts = (
    _index: FunctionalCoreEffectIndex
  ): ReadonlyArray<Subscription<FunctionalCoreBoundaryData>> => Array.empty()

  class Feature {
    constructor(
      readonly boundaryFacts: typeof emptyBoundaryFacts,
      readonly shapeFacts: typeof shapeSubscriptionsFor
    ) {}
  }

  return new Feature(emptyBoundaryFacts, shapeSubscriptionsFor)
}

export const orchestrationShapeFeature = makeOrchestrationShapeFeature()
