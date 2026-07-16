import { Array, Function, Match, Option, Schema, Tuple, pipe } from "effect"
import * as ts from "typescript"
import { withProgramIndex, foldAst } from "@better-typescript/core/engine/sources"
import {
  detection,
  fileSubscriptions,
  nodeSubscriptions
} from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check, Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { FunctionalCoreShapeData, type ArchitectureRole } from "./data.js"
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
import { unwrapCallee, unwrapTransparentExpression } from "../support/tsNode.js"

const emptyServiceNames: ReadonlyArray<string> = Array.empty()

const orchestratorServiceNamesSchema = Schema.Array(Schema.String)

// OrchestratorMetrics is shared shape accumulator because folds share one record.
export class OrchestratorMetrics extends Schema.Class<OrchestratorMetrics>("OrchestratorMetrics")({
  branchCount: Schema.Number,
  yieldCount: Schema.Number,
  transformationCount: Schema.Number,
  serviceNames: orchestratorServiceNamesSchema
}) {}

// FileShapeMetrics is shared file-shape accumulator because folds and thresholds share it.
export class FileShapeMetrics extends Schema.Class<FileShapeMetrics>("FileShapeMetrics")({
  branchCount: Schema.Number,
  functionCount: Schema.Number
}) {}

// ServiceSurfaceMetrics is shared service-surface tally because filters share one tally.
export class ServiceSurfaceMetrics extends Schema.Class<ServiceSurfaceMetrics>(
  "ServiceSurfaceMetrics"
)({
  functionCount: Schema.Number,
  nonFunctionCount: Schema.Number,
  effectfulMemberCount: Schema.Number
}) {}

const emptyOrchestratorMetrics = new OrchestratorMetrics({
  branchCount: 0,
  yieldCount: 0,
  transformationCount: 0,
  serviceNames: emptyServiceNames
})

const emptyFileShapeMetrics = new FileShapeMetrics({
  branchCount: 0,
  functionCount: 0
})

const emptyServiceSurfaceMetrics = new ServiceSurfaceMetrics({
  functionCount: 0,
  nonFunctionCount: 0,
  effectfulMemberCount: 0
})

const shapeMessage = "Functional-core architecture shape evidence for derived advice."

const shapeHint =
  "Use this silent evidence only after the structural threshold is met; do not treat one branch or helper as a local defect."

const isBranchNode = (node: ts.Node): boolean => {
  const isIf = ts.isIfStatement(node)
  const isSwitch = ts.isSwitchStatement(node)
  const isConditional = ts.isConditionalExpression(node)
  const checks = Array.make(isIf, isSwitch, isConditional)

  return Array.some(checks, Boolean)
}

const belongsToFunction = (node: ts.Node, owner: ts.FunctionLikeDeclaration): boolean =>
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

const nestedBeneathYield = (node: ts.Node, owner: ts.FunctionLikeDeclaration): boolean => {
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

const namespaceIsEffectControlRuntime = (namespace: string): boolean =>
  effectControlRuntimeNamespaces[namespace] === true

const callOwnedByEffectControlRuntime = (
  checker: ts.TypeChecker,
  node: ts.CallExpression
): boolean =>
  pipe(
    importedMemberAt(checker, node.expression),
    Option.exists((member) => {
      const fromSubpath = pipe(
        Option.liftPredicate((specifier: string) => specifier.startsWith("effect/"))(
          member.moduleSpecifier
        ),
        Option.map((specifier) => specifier.slice("effect/".length).split("/")[0]),
        Option.flatMap(Option.fromNullishOr),
        Option.exists(namespaceIsEffectControlRuntime)
      )

      const fromBarrel = pipe(
        Option.liftPredicate((specifier: string) => specifier === "effect")(member.moduleSpecifier),
        Option.map(() => member.path[0]),
        Option.flatMap(Option.fromNullishOr),
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
): boolean => {
  const owned = belongsToFunction(node, owner)
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

const callIsRecognizedCompositionApi = (
  checker: ts.TypeChecker,
  node: ts.CallExpression
): boolean => {
  const layer = importedEffectApiAt(checker, node.expression, "Layer", compositionLayerNames)
  const effect = importedEffectApiAt(checker, node.expression, "Effect", compositionEffectNames)

  const managedRuntimeMake = importedEffectApiAt(
    checker,
    node.expression,
    "ManagedRuntime",
    managedRuntimeMakeNames
  )

  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(node.expression)

  const managedRuntimeMethod = Option.exists(propertyAccess, (expression) =>
    isManagedRuntimeMethodAccess(checker, expression, compositionRuntimeNames)
  )

  const pipeRuntimeHandoff = callIsPipeRuntimeHandoff(checker, node, compositionRuntimeNames)

  const runMain = pipe(
    importedMemberAt(checker, node.expression),
    Option.exists((member) => {
      const name = pipe(Array.last(member.path), Option.getOrElse(Function.constant("")))
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

const nestedInRecognizedCompositionApi = (checker: ts.TypeChecker, node: ts.Node): boolean => {
  const visit = (current: ts.Node): boolean => {
    const matchingCall = pipe(
      Option.liftPredicate(ts.isCallExpression)(current),
      Option.exists((call) => callIsRecognizedCompositionApi(checker, call))
    )

    const parentNested = pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
    const nestedFlags = Array.make(matchingCall, parentNested)

    return Array.some(nestedFlags, Boolean)
  }

  return pipe(Option.fromNullishOr(node.parent), Option.exists(visit))
}

const isServiceTagExpression = (checker: ts.TypeChecker, expression: ts.Expression): boolean =>
  expressionIsServiceTag(checker, expression)

const addServiceName = (names: ReadonlyArray<string>, name: string): ReadonlyArray<string> =>
  Array.contains(names, name) ? names : Array.append(names, name)

const serviceYieldName = (
  checker: ts.TypeChecker,
  node: ts.YieldExpression
): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(node.asteriskToken),
    Option.flatMap(() => Option.fromNullishOr(node.expression)),
    Option.filter((expr) => isServiceTagExpression(checker, expr)),
    Option.map((expr) => expr.getText())
  )

const collectOrchestratorMetrics = (context: CheckContext, owner: ts.FunctionLikeDeclaration) => {
  const root = pipe(Option.fromNullishOr(owner.body), Option.getOrElse(Function.constant(owner)))

  return foldAst((metrics: typeof emptyOrchestratorMetrics, node: ts.Node) =>
    pipe(
      Option.liftPredicate((candidate: ts.Node) => belongsToFunction(candidate, owner))(node),
      Option.map((ownedNode) =>
        pipe(
          Match.value(ownedNode),
          Match.when(
            isBranchNode,
            () =>
              new OrchestratorMetrics({
                ...metrics,
                branchCount: metrics.branchCount + 1
              })
          ),
          Match.when(ts.isCallExpression, (call) =>
            isQualifyingTransformationCall(context, owner, call)
              ? new OrchestratorMetrics({
                  ...metrics,
                  transformationCount: metrics.transformationCount + 1
                })
              : metrics
          ),
          Match.when(ts.isYieldExpression, (yieldNode) =>
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
          ),
          Match.orElse(Function.constant(metrics))
        )
      ),
      Option.getOrElse(Function.constant(metrics))
    )
  )(root)(emptyOrchestratorMetrics)
}

const isOrchestratorFunctionArgument = (
  argument: ts.Expression
): argument is ts.ArrowFunction | ts.FunctionExpression => {
  const isArrow = ts.isArrowFunction(argument)
  const isFunction = ts.isFunctionExpression(argument)
  const functionFlags = Array.make(isArrow, isFunction)

  return Array.some(functionFlags, Boolean)
}

const orchestratorFunction = (
  node: ts.CallExpression
): Option.Option<ts.ArrowFunction | ts.FunctionExpression> =>
  Array.findFirst(node.arguments, isOrchestratorFunctionArgument)

const callIsEffectOrchestrator = (context: CheckContext, node: ts.CallExpression): boolean => {
  const callee = unwrapCallee(node.expression)
  const names = Array.make("gen", "fn", "fnUntraced")

  return importedEffectApiAt(context.checker, callee, "Effect", names)
}

const shapeDetection = (
  context: CheckContext,
  node: ts.Node,
  data: FunctionalCoreShapeData
): Detection => detection(context)({ node, message: shapeMessage, hint: shapeHint, data })

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
          orchestratorFunction(node),
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

            const data = new FunctionalCoreShapeData({
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

const functionResultExpression = (node: ts.FunctionLikeDeclaration): Option.Option<ts.Expression> =>
  pipe(
    Option.fromNullishOr(node.body),
    Option.flatMap((bodyNode) => {
      if (!ts.isBlock(bodyNode)) {
        return Option.some(bodyNode)
      }

      return pipe(
        bodyNode.statements,
        Array.head,
        Option.filter(Function.constant(bodyNode.statements.length === 1)),
        Option.filter(ts.isReturnStatement),
        Option.flatMap((statement) => Option.fromNullishOr(statement.expression))
      )
    })
  )

const functionReturnsComposition = (
  checker: ts.TypeChecker,
  node: ts.FunctionLikeDeclaration
): boolean =>
  pipe(
    functionResultExpression(node),
    Option.map(unwrapTransparentExpression),
    Option.exists((expression) =>
      pipe(
        Option.liftPredicate(ts.isCallExpression)(expression),
        Option.exists((call) => callIsRecognizedCompositionApi(checker, call))
      )
    )
  )

const collectFileShape = (context: CheckContext, role: ArchitectureRole) =>
  foldAst((metrics: typeof emptyFileShapeMetrics, node: ts.Node) => {
    const isRoot = role === "root"
    const nestedInComposition = nestedInRecognizedCompositionApi(context.checker, node)
    const nestedCompositionFlags = Array.make(isRoot, nestedInComposition)
    const nestedComposition = Array.every(nestedCompositionFlags, Boolean)
    const isRuntimeFunction = isRuntimeFunctionLike(node)

    const returnsComposition = pipe(
      Option.liftPredicate(isRuntimeFunctionLike)(node),
      Option.exists((fn) => functionReturnsComposition(context.checker, fn))
    )

    const returnedCompositionFlags = Array.make(isRoot, isRuntimeFunction, returnsComposition)
    const returnedComposition = Array.every(returnedCompositionFlags, Boolean)
    const excludeCompositionFlags = Array.make(nestedComposition, returnedComposition)
    const excludeComposition = Array.some(excludeCompositionFlags, Boolean)

    return excludeComposition
      ? metrics
      : pipe(
          Match.value(node),
          Match.when(
            isBranchNode,
            () =>
              new FileShapeMetrics({
                ...metrics,
                branchCount: metrics.branchCount + 1
              })
          ),
          Match.when(
            isRuntimeFunctionLike,
            () =>
              new FileShapeMetrics({
                ...metrics,
                functionCount: metrics.functionCount + 1
              })
          ),
          Match.orElse(Function.constant(metrics))
        )
  })(context.sourceFile)(emptyFileShapeMetrics)

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

  const data = new FunctionalCoreShapeData({
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
  (context: CheckContext): ReadonlyArray<Detection> =>
    pipe(
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
      Option.map((data) => shapeDetection(context, context.sourceFile, data)),
      Option.toArray
    )

const findContextTagTypeArgument = (expression: ts.Expression): Option.Option<ts.TypeNode> =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(expression),
    Option.flatMap((call) => {
      const arguments_ = pipe(
        Option.fromNullishOr(call.typeArguments),
        Option.getOrElse(Array.empty)
      )

      const second = Option.fromNullishOr(arguments_[1])

      return Option.orElse(second, () => findContextTagTypeArgument(call.expression))
    })
  )

const contextServiceTypeNode = (
  context: CheckContext,
  declaration: ts.ClassDeclaration
): Option.Option<ts.TypeNode> => {
  const serviceNames = Array.of("Service")

  return pipe(
    Option.fromNullishOr(declaration.heritageClauses),
    Option.getOrElse(Array.empty),
    Array.flatMap((clause) => Array.fromIterable(clause.types)),
    Array.findFirst((heritage) => {
      const callee = unwrapCallee(heritage.expression)

      return importedEffectApiAt(context.checker, callee, "Context", serviceNames)
    }),
    Option.flatMap((heritage) => findContextTagTypeArgument(heritage.expression))
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

const objectReturnedBy = (expression: ts.Expression): Option.Option<ts.ObjectLiteralExpression> => {
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

const effectWrappedServiceObject = (
  context: CheckContext,
  expression: ts.Expression
): Option.Option<ts.ObjectLiteralExpression> =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isCallExpression),
    Option.filter((call) =>
      importedEffectApiAt(context.checker, call.expression, "Effect", effectSucceedSyncNames)
    ),
    Option.flatMap((call) => pipe(Array.head(call.arguments), Option.flatMap(objectReturnedBy)))
  )

const effectServiceObject = (
  context: CheckContext,
  declaration: ts.ClassDeclaration
): Option.Option<ts.ObjectLiteralExpression> =>
  pipe(
    effectServiceConfigObject(context.checker, declaration),
    Option.flatMap((config) =>
      pipe(
        propertyAssignmentNamed(config, effectMakeNames),
        Option.flatMap((property) => effectWrappedServiceObject(context, property.initializer))
      )
    )
  )

const typeLooksEffectful = (checker: ts.TypeChecker, type: ts.Type): boolean => {
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
            const data = new FunctionalCoreShapeData({
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

export const makeFunctionalCoreShapeEvidence = (policy: FunctionalCoreEffectPolicy): Check =>
  withProgramIndex(buildFunctionalCoreEffectIndex(policy))(shapeSubscriptionsFor)
