import { Array, Data, Function, Option, Tuple, pipe } from "effect"
import * as ts from "typescript"
import {
  fileSubscriptions,
  nodeSubscriptions,
  withProgramIndex
} from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import { foldAst } from "@better-typescript/core/engine/sources"
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
  classExtendsEffectApi,
  effectServiceConfigObject,
  effectServiceDependencyProperty,
  enclosingFunctionLike,
  importedEffectApiAt,
  importedMemberAt,
  isManagedRuntimeMethodAccess,
  propertyAssignmentNamed,
  isRuntimeFunctionLike
} from "./support.js"
import { unwrapCallee, unwrapTransparentExpression } from "../support/tsNode.js"

class OrchestratorMetrics extends Data.Class<{
  readonly branchCount: number
  readonly yieldCount: number
  readonly transformationCount: number
  readonly serviceNames: ReadonlyArray<string>
}> {}

class FileShapeMetrics extends Data.Class<{
  readonly branchCount: number
  readonly functionCount: number
}> {}

class ServiceSurfaceMetrics extends Data.Class<{
  readonly functionCount: number
  readonly nonFunctionCount: number
  readonly effectfulMemberCount: number
}> {}

const emptyOrchestratorMetrics = new OrchestratorMetrics({
  branchCount: 0,
  yieldCount: 0,
  transformationCount: 0,
  serviceNames: Array.empty()
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
  const checks = Array.make(
    ts.isIfStatement(node),
    ts.isSwitchStatement(node),
    ts.isConditionalExpression(node)
  )

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
  FiberRef: true,
  Runtime: true,
  ManagedRuntime: true,
  Scope: true,
  Schedule: true,
  Fiber: true,
  Deferred: true,
  Cause: true,
  Exit: true
}

const nestedBeneathYield = (node: ts.Node, owner: ts.FunctionLikeDeclaration): boolean => {
  const visit = (current: ts.Node): boolean => {
    if (current === owner || current === owner.body) {
      return false
    }

    if (ts.isYieldExpression(current)) {
      return true
    }

    return pipe(Option.fromNullable(current.parent), Option.exists(visit))
  }

  return pipe(Option.fromNullable(node.parent), Option.exists(visit))
}

const callOwnedByEffectControlRuntime = (
  checker: ts.TypeChecker,
  node: ts.CallExpression
): boolean =>
  pipe(
    importedMemberAt(checker, node.expression),
    Option.exists((member) => {
      if (member.moduleSpecifier.startsWith("effect/")) {
        const namespace = member.moduleSpecifier.slice("effect/".length).split("/")[0]

        return effectControlRuntimeNamespaces[namespace] === true
      }

      if (member.moduleSpecifier !== "effect") {
        return false
      }

      const namespace = member.path[0]
      return namespace !== undefined && effectControlRuntimeNamespaces[namespace] === true
    })
  )

const isQualifyingTransformationCall = (
  context: CheckContext,
  owner: ts.FunctionLikeDeclaration,
  node: ts.CallExpression
): boolean => {
  if (!belongsToFunction(node, owner) || nestedBeneathYield(node, owner)) {
    return false
  }

  return !callOwnedByEffectControlRuntime(context.checker, node)
}

const compositionLayerNames = Array.make(
  "effect",
  "scoped",
  "scopedDiscard",
  "scopedContext",
  "succeed",
  "provide",
  "provideMerge"
)

const compositionEffectNames = Array.make(
  "provide",
  "provideService",
  "provideServiceEffect",
  "runCallback",
  "runFork",
  "runPromise",
  "runPromiseExit",
  "runSync",
  "runSyncExit"
)

const compositionRuntimeNames = Array.make(
  "runCallback",
  "runFork",
  "runPromise",
  "runPromiseExit",
  "runSync",
  "runSyncExit"
)

const callIsRecognizedCompositionApi = (
  checker: ts.TypeChecker,
  node: ts.CallExpression
): boolean => {
  const layer = importedEffectApiAt(checker, node.expression, "Layer", compositionLayerNames)

  const effect = importedEffectApiAt(checker, node.expression, "Effect", compositionEffectNames)

  const runtime = importedEffectApiAt(checker, node.expression, "Runtime", compositionRuntimeNames)

  const managedRuntime = importedEffectApiAt(
    checker,
    node.expression,
    "ManagedRuntime",
    Array.append(compositionRuntimeNames, "make")
  )

  const managedRuntimeMethod =
    ts.isPropertyAccessExpression(node.expression) &&
    isManagedRuntimeMethodAccess(checker, node.expression, compositionRuntimeNames)

  const runMain = pipe(
    importedMemberAt(checker, node.expression),
    Option.exists((member) => {
      const name = pipe(Array.last(member.path), Option.getOrElse(Function.constant("")))

      const platformRuntime =
        member.moduleSpecifier.startsWith("@effect/platform-node") ||
        member.moduleSpecifier.startsWith("@effect/platform-bun") ||
        member.moduleSpecifier.startsWith("@effect/platform-deno")

      return platformRuntime && name === "runMain"
    })
  )

  return layer || effect || runtime || managedRuntime || managedRuntimeMethod || runMain
}

const nestedInRecognizedCompositionApi = (checker: ts.TypeChecker, node: ts.Node): boolean => {
  const visit = (current: ts.Node): boolean => {
    if (ts.isCallExpression(current) && callIsRecognizedCompositionApi(checker, current)) {
      return true
    }

    return pipe(Option.fromNullable(current.parent), Option.exists(visit))
  }

  return pipe(Option.fromNullable(node.parent), Option.exists(visit))
}

const resolvedSymbolAt = (checker: ts.TypeChecker, node: ts.Node): Option.Option<ts.Symbol> =>
  pipe(
    checker.getSymbolAtLocation(node),
    Option.fromNullable,
    Option.map((symbol) => {
      const alias = (symbol.flags & ts.SymbolFlags.Alias) !== 0
      return alias ? checker.getAliasedSymbol(symbol) : symbol
    })
  )

const isServiceTagExpression = (checker: ts.TypeChecker, expression: ts.Expression): boolean =>
  pipe(
    resolvedSymbolAt(checker, expression),
    Option.map((symbol) => symbol.declarations ?? Array.empty()),
    Option.exists((declarations) =>
      Array.some(declarations, (declaration) => {
        if (!ts.isClassDeclaration(declaration)) {
          return false
        }

        const contextTag = classExtendsEffectApi(checker, declaration, "Context", "Tag")

        const effectService = classExtendsEffectApi(checker, declaration, "Effect", "Service")

        return contextTag || effectService
      })
    )
  )

const addServiceName = (names: ReadonlyArray<string>, name: string): ReadonlyArray<string> =>
  Array.contains(names, name) ? names : Array.append(names, name)

const collectOrchestratorMetrics = (
  context: CheckContext,
  owner: ts.FunctionLikeDeclaration
): OrchestratorMetrics =>
  foldAst((metrics: OrchestratorMetrics, node: ts.Node) => {
    if (!belongsToFunction(node, owner)) {
      return metrics
    }

    if (isBranchNode(node)) {
      return new OrchestratorMetrics({
        ...metrics,
        branchCount: metrics.branchCount + 1
      })
    }

    if (ts.isCallExpression(node) && isQualifyingTransformationCall(context, owner, node)) {
      return new OrchestratorMetrics({
        ...metrics,
        transformationCount: metrics.transformationCount + 1
      })
    }

    if (
      !ts.isYieldExpression(node) ||
      node.asteriskToken === undefined ||
      node.expression === undefined ||
      !isServiceTagExpression(context.checker, node.expression)
    ) {
      return metrics
    }

    return new OrchestratorMetrics({
      ...metrics,
      yieldCount: metrics.yieldCount + 1,
      serviceNames: addServiceName(metrics.serviceNames, node.expression.getText())
    })
  })(owner.body ?? owner)(emptyOrchestratorMetrics)

const orchestratorFunction = (
  node: ts.CallExpression
): Option.Option<ts.ArrowFunction | ts.FunctionExpression> =>
  Array.findFirst(
    node.arguments,
    (argument): argument is ts.ArrowFunction | ts.FunctionExpression =>
      ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)
  )

const callIsEffectOrchestrator = (context: CheckContext, node: ts.CallExpression): boolean => {
  const callee = unwrapCallee(node.expression)

  return importedEffectApiAt(
    context.checker,
    callee,
    "Effect",
    Array.make("gen", "fn", "fnUntraced")
  )
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

    if (!applicationRole || !callIsEffectOrchestrator(context, node)) {
      return Array.empty()
    }

    return pipe(
      orchestratorFunction(node),
      Option.map((owner) => {
        const metrics = collectOrchestratorMetrics(context, owner)
        const hasSeveralServices = metrics.serviceNames.length >= 2
        const hasSeveralBranches = metrics.branchCount >= 2
        const hasSeveralTransformations = metrics.transformationCount >= 3

        if (!hasSeveralServices || !(hasSeveralBranches || hasSeveralTransformations)) {
          return Array.empty<Detection>()
        }

        const data = new FunctionalCoreShapeData({
          kind: "effect-orchestrator",
          role: "application",
          branchCount: metrics.branchCount,
          functionCount: 1,
          serviceCount: metrics.serviceNames.length,
          effectfulMemberCount: metrics.yieldCount,
          transformationCount: metrics.transformationCount
        })

        return Array.of(shapeDetection(context, owner, data))
      }),
      Option.getOrElse(Array.empty<Detection>)
    )
  }

const functionResultExpression = (
  node: ts.FunctionLikeDeclaration
): Option.Option<ts.Expression> => {
  const body = node.body

  if (body === undefined) {
    return Option.none()
  }

  if (!ts.isBlock(body)) {
    return Option.some(body)
  }

  return pipe(
    body.statements,
    Array.head,
    Option.filter(() => body.statements.length === 1),
    Option.flatMap((statement) =>
      ts.isReturnStatement(statement) ? Option.fromNullable(statement.expression) : Option.none()
    )
  )
}

const functionReturnsComposition = (
  checker: ts.TypeChecker,
  node: ts.FunctionLikeDeclaration
): boolean =>
  pipe(
    functionResultExpression(node),
    Option.map(unwrapTransparentExpression),
    Option.exists(
      (expression) =>
        ts.isCallExpression(expression) && callIsRecognizedCompositionApi(checker, expression)
    )
  )

const collectFileShape = (context: CheckContext, role: ArchitectureRole): FileShapeMetrics =>
  foldAst((metrics: FileShapeMetrics, node: ts.Node) => {
    const nestedComposition =
      role === "root" && nestedInRecognizedCompositionApi(context.checker, node)

    const returnedComposition =
      role === "root" &&
      isRuntimeFunctionLike(node) &&
      functionReturnsComposition(context.checker, node)

    const excludeComposition = nestedComposition || returnedComposition

    if (excludeComposition) {
      return metrics
    }

    if (isBranchNode(node)) {
      return new FileShapeMetrics({
        ...metrics,
        branchCount: metrics.branchCount + 1
      })
    }

    if (isRuntimeFunctionLike(node)) {
      return new FileShapeMetrics({
        ...metrics,
        functionCount: metrics.functionCount + 1
      })
    }

    return metrics
  })(context.sourceFile)(emptyFileShapeMetrics)

const fileShapeData = (
  role: ArchitectureRole,
  metrics: FileShapeMetrics
): Option.Option<FunctionalCoreShapeData> => {
  const adapterEvidence =
    role === "adapter" && metrics.branchCount >= 3 && metrics.functionCount >= 2

  const rootEvidence = role === "root" && (metrics.branchCount >= 2 || metrics.functionCount >= 2)

  if (!adapterEvidence && !rootEvidence) {
    return Option.none()
  }

  const kind = adapterEvidence ? "adapter-business-logic" : "thick-composition-root"

  return Option.some(
    new FunctionalCoreShapeData({
      kind,
      role,
      branchCount: metrics.branchCount,
      functionCount: metrics.functionCount,
      serviceCount: 0,
      effectfulMemberCount: 0,
      transformationCount: 0
    })
  )
}

const fileShapeElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext): ReadonlyArray<Detection> =>
    pipe(
      roleForSourceFile(index, context.sourceFile),
      Option.filter((role) => role === "adapter" || role === "root"),
      Option.flatMap((role) => fileShapeData(role, collectFileShape(context, role))),
      Option.map((data) => shapeDetection(context, context.sourceFile, data)),
      Option.toArray
    )

const contextServiceTypeNode = (
  context: CheckContext,
  declaration: ts.ClassDeclaration
): Option.Option<ts.TypeNode> => {
  const clauses = declaration.heritageClauses ?? Array.empty()

  return pipe(
    clauses,
    Array.flatMap((clause) => Array.fromIterable(clause.types)),
    Array.findFirst((heritage) => {
      const callee = unwrapCallee(heritage.expression)
      return importedEffectApiAt(context.checker, callee, "Context", Array.of("Tag"))
    }),
    Option.flatMap((heritage) => {
      const findTypeArgument = (expression: ts.Expression): Option.Option<ts.TypeNode> => {
        if (ts.isCallExpression(expression)) {
          const arguments_ = expression.typeArguments ?? Array.empty()

          if (arguments_.length >= 2) {
            return Option.fromNullable(arguments_[1])
          }

          return findTypeArgument(expression.expression)
        }

        return Option.none()
      }

      return findTypeArgument(heritage.expression)
    })
  )
}

const objectReturnedBy = (expression: ts.Expression): Option.Option<ts.ObjectLiteralExpression> => {
  const unwrapped = unwrapTransparentExpression(expression)

  if (ts.isObjectLiteralExpression(unwrapped)) {
    return Option.some(unwrapped)
  }

  if (!ts.isArrowFunction(unwrapped) && !ts.isFunctionExpression(unwrapped)) {
    return Option.none()
  }

  return pipe(
    functionResultExpression(unwrapped),
    Option.map(unwrapTransparentExpression),
    Option.filter(ts.isObjectLiteralExpression)
  )
}

const effectWrappedServiceObject = (
  context: CheckContext,
  expression: ts.Expression
): Option.Option<ts.ObjectLiteralExpression> => {
  const unwrapped = unwrapTransparentExpression(expression)

  if (
    !ts.isCallExpression(unwrapped) ||
    !importedEffectApiAt(
      context.checker,
      unwrapped.expression,
      "Effect",
      Array.make("succeed", "sync")
    )
  ) {
    return Option.none()
  }

  return pipe(Array.head(unwrapped.arguments), Option.flatMap(objectReturnedBy))
}

const effectServiceObject = (
  context: CheckContext,
  declaration: ts.ClassDeclaration
): Option.Option<ts.ObjectLiteralExpression> => {
  if (Option.isSome(effectServiceDependencyProperty(context.checker, declaration))) {
    return Option.none()
  }

  return pipe(
    effectServiceConfigObject(context.checker, declaration),
    Option.flatMap((config) => {
      const direct = pipe(
        propertyAssignmentNamed(config, Array.make("succeed", "sync")),
        Option.flatMap((property) => objectReturnedBy(property.initializer))
      )

      return pipe(
        direct,
        Option.orElse(() =>
          pipe(
            propertyAssignmentNamed(config, Array.of("effect")),
            Option.flatMap((property) => effectWrappedServiceObject(context, property.initializer))
          )
        )
      )
    })
  )
}

const typeLooksEffectful = (checker: ts.TypeChecker, type: ts.Type): boolean => {
  const rendered = checker.typeToString(type)

  const markers = Array.make("Effect<", "Stream<", "Channel<", "Sink<", "Ref<", "Queue<", "PubSub<")

  return Array.some(markers, (marker) => rendered.includes(marker))
}

const serviceSurfaceMetrics = (
  checker: ts.TypeChecker,
  type: ts.Type,
  location: ts.Node
): ServiceSurfaceMetrics =>
  Array.reduce(type.getProperties(), emptyServiceSurfaceMetrics, (metrics, property) => {
    const propertyType = checker.getTypeOfSymbolAtLocation(property, location)
    const signatures = propertyType.getCallSignatures()

    if (signatures.length === 0) {
      return new ServiceSurfaceMetrics({
        ...metrics,
        nonFunctionCount: metrics.nonFunctionCount + 1
      })
    }

    const effectful = Array.some(signatures, (signature) =>
      typeLooksEffectful(checker, signature.getReturnType())
    )

    return new ServiceSurfaceMetrics({
      functionCount: metrics.functionCount + 1,
      nonFunctionCount: metrics.nonFunctionCount,
      effectfulMemberCount: metrics.effectfulMemberCount + (effectful ? 1 : 0)
    })
  })

const pureServiceElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.ClassDeclaration): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    const relevantRole = pipe(
      role,
      Option.filter((value) => value === "port" || value === "application")
    )

    if (Option.isNone(relevantRole)) {
      return Array.empty()
    }

    const contextTypeNode = contextServiceTypeNode(context, node)
    const serviceObject = effectServiceObject(context, node)

    const surface = pipe(
      contextTypeNode,
      Option.map((typeNode) =>
        Tuple.make(context.checker.getTypeFromTypeNode(typeNode), typeNode as ts.Node)
      ),
      Option.orElse(() =>
        pipe(
          serviceObject,
          Option.map((object) =>
            Tuple.make(context.checker.getTypeAtLocation(object), object as ts.Node)
          )
        )
      )
    )

    return pipe(
      surface,
      Option.map(([type, location]) => serviceSurfaceMetrics(context.checker, type, location)),
      Option.filter((metrics) => {
        const hasFunctions = metrics.functionCount > 0
        const allFunctions = metrics.nonFunctionCount === 0
        const allPure = metrics.effectfulMemberCount === 0
        return hasFunctions && allFunctions && allPure
      }),
      Option.map((metrics) => {
        const data = new FunctionalCoreShapeData({
          kind: "pure-service",
          role: relevantRole.value,
          branchCount: 0,
          functionCount: metrics.functionCount,
          serviceCount: 1,
          effectfulMemberCount: metrics.effectfulMemberCount,
          transformationCount: 0
        })

        const target = pipe(
          Option.fromNullable(node.name),
          Option.getOrElse(Function.constant(node))
        )

        return shapeDetection(context, target, data)
      }),
      Option.toArray
    )
  }

const callKinds = Array.of(ts.SyntaxKind.CallExpression)
const classKinds = Array.of(ts.SyntaxKind.ClassDeclaration)

const subscriptionsFor = (index: FunctionalCoreEffectIndex): ReadonlyArray<Subscription> =>
  Array.flatten(
    Array.make(
      nodeSubscriptions(callKinds)(ts.isCallExpression)(orchestratorElements(index)),
      nodeSubscriptions(classKinds)(ts.isClassDeclaration)(pureServiceElements(index)),
      fileSubscriptions(fileShapeElements(index))
    )
  )

export const makeFunctionalCoreShapeEvidence = (policy: FunctionalCoreEffectPolicy): Check =>
  withProgramIndex(buildFunctionalCoreEffectIndex(policy))(subscriptionsFor)
