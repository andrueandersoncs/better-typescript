import { Array, Function, Match, Option, Schema, Tuple, pipe } from "effect"
import * as ts from "typescript"
import { foldAst } from "@better-typescript/core/engine/sources"
import { withProgramIndex } from "../../defineCheck.js"
import {
  makeDetection,
  fileSubscriptions,
  nodeSubscriptions
} from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { FunctionalCoreShapeData } from "./data.js"
import type { ArchitectureRole } from "../support/architectureRole.js"
import {
  buildFunctionalCoreEffectIndex,
  type FunctionalCoreEffectIndex,
  roleForSourceFile
} from "./index.js"
import type { FunctionalCoreEffectPolicy } from "./policy.js"
import {
  callIsPipeRuntimeHandoff,
  effectServiceConfigObject,
  enclosingFunctionLike,
  expressionIsServiceTag,
  importedEffectApiAt,
  importedMemberAt,
  isManagedRuntimeMethodAccess,
  propertyAssignmentNamed,
  isRuntimeFunctionLike
} from "./support.js"
import {
  isExpressionBody,
  singleStatementReturnExpression,
  unwrapCallee,
  unwrapTransparentExpression
} from "../support/tsNode.js"

const emptyServiceNames: ReadonlyArray<string> = Array.empty()

const orchestratorServiceNamesSchema = Schema.Array(Schema.String)

// OrchestratorMetrics is shared shape accumulator because folds share one record.
export const OrchestratorMetrics = Schema.Struct({
  branchCount: Schema.Number,
  yieldCount: Schema.Number,
  transformationCount: Schema.Number,
  serviceNames: orchestratorServiceNamesSchema
})

export interface OrchestratorMetrics extends Schema.Schema.Type<typeof OrchestratorMetrics> {}

// FileShapeMetrics is shared file-shape accumulator because folds and thresholds share it.
export const FileShapeMetrics = Schema.Struct({
  branchCount: Schema.Number,
  functionCount: Schema.Number
})

export interface FileShapeMetrics extends Schema.Schema.Type<typeof FileShapeMetrics> {}

// ServiceSurfaceMetrics is shared service-surface tally because filters share one tally.
export const ServiceSurfaceMetrics = Schema.Struct({
  functionCount: Schema.Number,
  nonFunctionCount: Schema.Number,
  effectfulMemberCount: Schema.Number
})

export interface ServiceSurfaceMetrics extends Schema.Schema.Type<typeof ServiceSurfaceMetrics> {}

const emptyOrchestratorMetrics = OrchestratorMetrics.make({
  branchCount: 0,
  yieldCount: 0,
  transformationCount: 0,
  serviceNames: emptyServiceNames
})

const emptyFileShapeMetrics = FileShapeMetrics.make({ branchCount: 0, functionCount: 0 })

const emptyServiceSurfaceMetrics = ServiceSurfaceMetrics.make({
  functionCount: 0,
  nonFunctionCount: 0,
  effectfulMemberCount: 0
})

const shapeMessage = "Functional-core architecture shape evidence for derived advice."

const shapeHint =
  "Use this silent evidence only after the structural threshold is met; do not treat one branch or helper as a local defect."

const isBranchNode = (node: ts.Node) => {
  const isIf = ts.isIfStatement(node)
  const isSwitch = ts.isSwitchStatement(node)
  const isConditional = ts.isConditionalExpression(node)
  const checks = Array.make(isIf, isSwitch, isConditional)

  return Array.some(checks, Boolean)
}

const isOwnedByFunction = (node: ts.Node, owner: ts.FunctionLikeDeclaration) =>
  pipe(
    enclosingFunctionLike(node),
    Option.exists((declaration) => declaration === owner)
  )

const effectControlRuntimeNamespaces: Readonly<Record<string, true>> = {
  Effect: true,
  Layer: true,
  Context: true,
  Stream: true,
  Sink: true,
  Channel: true,
  Ref: true,
  SynchronizedRef: true,
  Queue: true,
  PubSub: true,
  SubscriptionRef: true,
  References: true,
  Runtime: true,
  ManagedRuntime: true,
  Scope: true,
  Schedule: true,
  Fiber: true,
  Deferred: true,
  Cause: true,
  Exit: true,
  Latch: true,
  Semaphore: true
}

const nestedBeneathYield = (node: ts.Node, owner: ts.FunctionLikeDeclaration) => {
  const visit = (current: ts.Node): boolean => {
    const atOwner = current === owner
    const atBody = current === owner.body
    const boundaryFlags = Array.make(atOwner, atBody)
    const atBoundary = Array.some(boundaryFlags, Boolean)

    return pipe(
      Option.liftPredicate((value: boolean) => value === false)(atBoundary),
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
  effectControlRuntimeNamespaces[namespace] === true

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
        Option.liftPredicate((specifier: string) => specifier === "effect")(member.moduleSpecifier),
        Option.flatMap(keepPathHead),
        Option.exists(namespaceIsEffectControlRuntime)
      )

      const runtimeFlags = Array.make(fromSubpath, fromBarrel)

      return Array.some(runtimeFlags, Boolean)
    })
  )

const isQualifyingTransformationCall = (
  context: CheckContext,
  owner: ts.FunctionLikeDeclaration,
  node: ts.CallExpression
) => {
  const owned = isOwnedByFunction(node, owner)
  const nested = nestedBeneathYield(node, owner)
  const notNested = nested === false
  const continueFlags = Array.make(owned, notNested)
  const continues = Array.every(continueFlags, Boolean)
  const external = callOwnedByEffectControlRuntime(context.checker, node) === false
  const continueExternalFlags = Array.make(continues, external)

  return Array.every(continueExternalFlags, Boolean)
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
      const isRunMain = name === "runMain"
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

const isServiceTagExpression = (checker: ts.TypeChecker, expression: ts.Expression) =>
  expressionIsServiceTag(checker, expression)

const addServiceName = (names: ReadonlyArray<string>, name: string): ReadonlyArray<string> =>
  Array.contains(names, name) ? names : Array.append(names, name)

const serviceYieldName = (checker: ts.TypeChecker, node: ts.YieldExpression) => {
  const expressionIsServiceTagCheck = (expr: ts.Expression) => isServiceTagExpression(checker, expr)
  return pipe(
    Option.fromNullishOr(node.asteriskToken),
    Option.flatMap(() => Option.fromNullishOr(node.expression)),
    Option.filter(expressionIsServiceTagCheck),
    Option.map((expr) => expr.getText())
  )
}

const collectOrchestratorMetrics = (context: CheckContext, owner: ts.FunctionLikeDeclaration) => {
  const root = pipe(Option.fromNullishOr(owner.body), Option.getOrElse(Function.constant(owner)))
  const nodeIsOwnedByFunction = (candidate: ts.Node) => isOwnedByFunction(candidate, owner)
  return foldAst((metrics: typeof emptyOrchestratorMetrics, node: ts.Node) => {
    const qualifyingCallMetrics = (call: ts.CallExpression) =>
      isQualifyingTransformationCall(context, owner, call)
        ? OrchestratorMetrics.make({
            ...metrics,
            transformationCount: metrics.transformationCount + 1
          })
        : metrics

    const yieldServiceMetrics = (yieldNode: ts.YieldExpression) =>
      pipe(
        serviceYieldName(context.checker, yieldNode),
        Option.map((text) => {
          const serviceNames = addServiceName(metrics.serviceNames, text)

          return OrchestratorMetrics.make({
            ...metrics,
            yieldCount: metrics.yieldCount + 1,
            serviceNames
          })
        }),
        Option.getOrElse(Function.constant(metrics))
      )

    const pipeOf = (ownedNode: ts.Node) =>
      pipe(
        Match.value(ownedNode),
        Match.when(isBranchNode, () =>
          OrchestratorMetrics.make({
            ...metrics,
            branchCount: metrics.branchCount + 1
          })
        ),
        Match.when(ts.isCallExpression, qualifyingCallMetrics),
        Match.when(ts.isYieldExpression, yieldServiceMetrics),
        Match.orElse(Function.constant(metrics))
      )

    return pipe(
      Option.liftPredicate(nodeIsOwnedByFunction)(node),
      Option.map(pipeOf),
      Option.getOrElse(Function.constant(metrics))
    )
  })(root)(emptyOrchestratorMetrics)
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

const callIsEffectOrchestrator = (context: CheckContext, node: ts.CallExpression) => {
  const callee = unwrapCallee(node.expression)
  const names = Array.make("gen", "fn", "fnUntraced")

  return importedEffectApiAt(context.checker, callee, "Effect", names)
}

const shapeDetection = (context: CheckContext, node: ts.Node, data: FunctionalCoreShapeData) =>
  makeDetection(context)({ node, message: shapeMessage, hint: shapeHint, data })

const orchestratorElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.CallExpression): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)
    const applicationRole = Option.exists(role, (value) => value === "application")
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

            return qualifies ? detections : Array.empty<Detection>()
          }),
          Option.getOrElse(Array.empty<Detection>)
        )
      : Array.empty()
  }

const resultExpressionFromBody = (bodyNode: ts.ConciseBody) =>
  isExpressionBody(bodyNode) ? Option.some(bodyNode) : singleStatementReturnExpression(bodyNode)

const functionResultExpression = (node: ts.FunctionLikeDeclaration) =>
  pipe(Option.fromNullishOr(node.body), Option.flatMap(resultExpressionFromBody))

const functionReturnsComposition = (checker: ts.TypeChecker, node: ts.FunctionLikeDeclaration) => {
  const callIsRecognizedComposition2 = (call: ts.CallExpression) =>
    callIsRecognizedCompositionApi(checker, call)

  const pipeOf2 = (expression: ts.Expression) =>
    pipe(
      Option.liftPredicate(ts.isCallExpression)(expression),
      Option.exists(callIsRecognizedComposition2)
    )

  return pipe(
    functionResultExpression(node),
    Option.map(unwrapTransparentExpression),
    Option.exists(pipeOf2)
  )
}

const collectFileShape = (context: CheckContext, role: ArchitectureRole) => {
  const functionReturnsCompositionCheck = (fn: ts.FunctionLikeDeclaration) =>
    functionReturnsComposition(context.checker, fn)

  return foldAst((metrics: typeof emptyFileShapeMetrics, node: ts.Node) => {
    const isRoot = role === "root"
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
          Match.value(node),
          Match.when(isBranchNode, () =>
            FileShapeMetrics.make({
              ...metrics,
              branchCount: metrics.branchCount + 1
            })
          ),
          Match.when(isRuntimeFunctionLike, () =>
            FileShapeMetrics.make({
              ...metrics,
              functionCount: metrics.functionCount + 1
            })
          ),
          Match.orElse(Function.constant(metrics))
        )
  })(context.sourceFile)(emptyFileShapeMetrics)
}

const fileShapeData = (
  role: ArchitectureRole,
  metrics: typeof emptyFileShapeMetrics
): Option.Option<FunctionalCoreShapeData> => {
  const isAdapter = role === "adapter"
  const adapterBranches = metrics.branchCount >= 3
  const adapterFunctions = metrics.functionCount >= 2
  const adapterEvidenceFlags = Array.make(isAdapter, adapterBranches, adapterFunctions)
  const adapterEvidence = Array.every(adapterEvidenceFlags, Boolean)
  const isRoot = role === "root"
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
  (context: CheckContext): ReadonlyArray<Detection> => {
    const shapeDetectionOf = (data: FunctionalCoreShapeData) =>
      shapeDetection(context, context.sourceFile, data)

    return pipe(
      roleForSourceFile(index, context.sourceFile),
      Option.filter((role) => {
        const isAdapter = role === "adapter"
        const isRoot = role === "root"
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

const contextServiceTypeNode = (context: CheckContext, declaration: ts.ClassDeclaration) => {
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

const effectWrappedServiceObject = (context: CheckContext, expression: ts.Expression) => {
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

const effectServiceObject = (context: CheckContext, declaration: ts.ClassDeclaration) => {
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
  const markers = Array.make("Effect<", "Stream<", "Channel<", "Sink<", "Ref<", "Queue<", "PubSub<")

  return Array.some(markers, (marker) => rendered.includes(marker))
}

const serviceSurfaceMetrics = (checker: ts.TypeChecker, type: ts.Type, location: ts.Node) => {
  const properties = type.getProperties()

  return Array.reduce(properties, emptyServiceSurfaceMetrics, (metrics, property) => {
    const propertyType = checker.getTypeOfSymbolAtLocation(property, location)
    const signatures = propertyType.getCallSignatures()
    const isNonFunction = signatures.length === 0

    const effectful = Array.some(signatures, (signature) => {
      const returnType = signature.getReturnType()

      return typeLooksEffectful(checker, returnType)
    })

    const nonFunctionMetrics = ServiceSurfaceMetrics.make({
      ...metrics,
      nonFunctionCount: metrics.nonFunctionCount + 1
    })

    const functionMetrics = ServiceSurfaceMetrics.make({
      functionCount: metrics.functionCount + 1,
      nonFunctionCount: metrics.nonFunctionCount,
      effectfulMemberCount: metrics.effectfulMemberCount + (effectful ? 1 : 0)
    })

    return isNonFunction ? nonFunctionMetrics : functionMetrics
  })
}

const pureServiceElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.ClassDeclaration): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    const relevantRole = pipe(
      role,
      Option.filter((value) => {
        const isPort = value === "port"
        const isApplication = value === "application"
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
          Option.map(([type, location]) => serviceSurfaceMetrics(context.checker, type, location)),
          Option.filter((metrics) => {
            const hasFunctions = metrics.functionCount > 0
            const allFunctions = metrics.nonFunctionCount === 0
            const allPure = metrics.effectfulMemberCount === 0
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

const shapeSubscriptionsFor = (index: FunctionalCoreEffectIndex): ReadonlyArray<Subscription> => {
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

export const makeFunctionalCoreShapeEvidence = (policy: FunctionalCoreEffectPolicy) => {
  const buildIndex = buildFunctionalCoreEffectIndex(policy)

  return withProgramIndex(buildIndex)(shapeSubscriptionsFor)
}
