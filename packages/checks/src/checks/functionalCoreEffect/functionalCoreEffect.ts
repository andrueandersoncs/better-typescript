import {
  Array,
  Function,
  HashSet,
  Match,
  Option,
  Record as EffectRecord,
  Struct,
  pipe
} from "effect"
import * as ts from "typescript"
import { foldAst } from "@better-typescript/core/engine/sources"
import { withProgramIndex } from "../../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import {
  FunctionalCoreBoundaryData,
  type ArchitectureRole,
  type FunctionalCoreBoundaryKind
} from "./data.js"
import {
  buildFunctionalCoreEffectIndex,
  type FunctionalCoreEffectIndex,
  roleForSourceFile
} from "./index.js"
import type { FunctionalCoreEffectPolicy } from "./policy.js"
import { detection, nodeSubscriptions } from "@better-typescript/core/engine/check"
import {
  ambientCapabilityPropertySubject,
  callIsPipeRuntimeHandoff,
  callIsReferenceProvideService,
  capabilitySubjectAt,
  effectApiMember,
  contextServiceLayerProperty,
  declarationIsContextService,
  effectServiceConfigFromExpression,
  effectServiceConfigObject,
  hasScopedLifecycleAncestor,
  hasSuspensionBoundary,
  importHasRuntimeValue,
  importedEffectApiAt,
  importedMemberAt,
  importedMemberIsMovedPlatformCapability,
  importedTypeMemberAt,
  localTypeReferenceTargets,
  isManagedRuntimeMethodAccess,
  isTopLevelExportedDeclaration,
  moduleMatchesPolicyPrefix,
  moduleSpecifierText,
  resolvedModuleSourceFile,
  resourceSubjectAt,
  sourceFileScopesFunction,
  typeReferenceIsGlobalPromise,
  type ImportedMember
} from "./support.js"

const messageByKind: Readonly<Record<FunctionalCoreBoundaryKind, string>> = {
  "dependency-direction": "This dependency points outward across the functional-core architecture.",
  "domain-effect-program":
    "Keep the domain core pure instead of constructing an Effect program here.",
  "direct-capability": "Access concrete capabilities only through an adapter at a declared seam.",
  "runtime-execution": "Run Effect programs only at a configured composition root.",
  "dependency-provisioning": "Choose and provide live implementations only at a composition root.",
  "port-live-implementation":
    "A port declares an interface; its live implementation belongs in an adapter.",
  "infrastructure-contract":
    "Do not expose infrastructure or mutable runtime handles through a port contract.",
  "service-locator":
    "Require individual services through the Effect context channel instead of passing a context or runtime bag.",
  "unsuspended-adapter-effect":
    "Suspend the foreign operation before composing it into an Effect program.",
  "unscoped-resource": "Acquire this external resource in an Effect-managed lifecycle.",
  "escaping-runtime-state":
    "Create shared Effect state inside a Layer.effect service instead of letting it escape."
}

const hintByKind: Readonly<Record<FunctionalCoreBoundaryKind, string>> = {
  "dependency-direction":
    "Move the dependency behind a domain-owned port, or move this behaviour to the outer role that owns the implementation.",
  "domain-effect-program":
    "Return an immutable domain decision from a plain function; let application code translate the decision into Effect operations.",
  "direct-capability":
    "Declare a Context.Service port with domain inputs and outputs, then implement it with a Layer in an adapter.",
  "runtime-execution":
    "Return the Effect value with its requirements visible; provide and run it once in main, bootstrap, wiring, or a test boundary.",
  "dependency-provisioning":
    "Leave the R channel open through application code and compose Layers where the application starts.",
  "port-live-implementation":
    "Use Context.Service for the port and export Layer.effect or Layer.succeed from an adapter Module.",
  "infrastructure-contract":
    "Expose domain-owned values, errors, Effect, or Stream; keep SDK clients, Promise, Runtime, Ref, Queue, and PubSub private to the adapter.",
  "service-locator":
    "Yield the precise Context.Service requirement where it is used; never pass Context.Context or a Runtime as a dependency bag.",
  "unsuspended-adapter-effect":
    "Use Effect.sync, Effect.try, Effect.tryPromise, or Effect.callback around the lazy foreign call; Effect.succeed does not suspend work.",
  "unscoped-resource":
    "Pair acquisition and release with Effect.acquireRelease or acquireDisposable, then expose the scoped implementation through a Layer.",
  "escaping-runtime-state":
    "Use Ref.make or the appropriate Queue/PubSub constructor while building a Layer.effect service and keep the handle out of the port surface."
}

const emptyPath: ReadonlyArray<string> = Array.empty()
const emptyIdentifiers: ReadonlyArray<ts.Identifier> = Array.empty()
const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const emptySymbols: ReadonlyArray<ts.Symbol> = Array.empty()
const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()
const noneIdentifier: Option.Option<ts.Identifier> = Option.none()
const noneString: Option.Option<string> = Option.none()
const constantNoneIdentifier = Function.constant(noneIdentifier)
const constantNoneString = Function.constant(noneString)

const adapterOrRootRoles = HashSet.make("adapter" as ArchitectureRole, "root" as ArchitectureRole)

const isAdapterOrRootRole = (role: ArchitectureRole) => HashSet.has(adapterOrRootRoles, role)

const boundaryDetection = (
  context: CheckContext,
  node: ts.Node,
  role: ArchitectureRole,
  kind: FunctionalCoreBoundaryKind,
  subject: string,
  targetRole: Option.Option<ArchitectureRole> = Option.none()
) => {
  const resolvedTargetRole = Option.getOrUndefined(targetRole)

  const data = new FunctionalCoreBoundaryData({
    kind,
    role,
    subject,
    targetRole: resolvedTargetRole
  })

  return detection(context)({
    node,
    message: messageByKind[kind],
    hint: hintByKind[kind],
    data
  })
}

const allowedTargetRoles: Readonly<
  Record<ArchitectureRole, Readonly<Record<ArchitectureRole, boolean>>>
> = {
  domain: {
    domain: true,
    port: false,
    application: false,
    adapter: false,
    root: false,
    test: false
  },
  port: {
    domain: true,
    port: true,
    application: false,
    adapter: false,
    root: false,
    test: false
  },
  application: {
    domain: true,
    port: true,
    application: true,
    adapter: false,
    root: false,
    test: false
  },
  adapter: {
    domain: true,
    port: true,
    application: true,
    adapter: true,
    root: false,
    test: false
  },
  root: {
    domain: true,
    port: true,
    application: true,
    adapter: true,
    root: true,
    test: true
  },
  test: {
    domain: true,
    port: true,
    application: true,
    adapter: true,
    root: true,
    test: true
  }
}

const capabilityForbiddenRoles: Readonly<Record<ArchitectureRole, boolean>> = {
  domain: true,
  port: true,
  application: true,
  adapter: false,
  root: false,
  test: false
}

const canImportRole = (importer: ArchitectureRole, imported: ArchitectureRole) =>
  allowedTargetRoles[importer][imported]

const forbiddenDomainNamespaces: Readonly<Record<string, true>> = {
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
  Latch: true,
  Semaphore: true
}

const namespaceIsForbidden = (namespace: string) => forbiddenDomainNamespaces[namespace] === true

const isForbiddenDomainMember = (moduleSpecifier: string, path: ReadonlyArray<string>) => {
  if (moduleSpecifier.startsWith("effect/")) {
    const namespace = moduleSpecifier.slice("effect/".length).split("/")[0]
    return namespaceIsForbidden(namespace)
  }

  const isEffectModule = moduleSpecifier === "effect"

  const namespaceForbidden = pipe(
    Option.fromNullishOr(path[0]),
    Option.match({
      onNone: Function.constTrue,
      onSome: namespaceIsForbidden
    })
  )

  return isEffectModule && namespaceForbidden
}

const propertyAccessRootIdentifier = (expression: ts.Expression): Option.Option<ts.Identifier> =>
  pipe(
    Match.value(expression),
    Match.when(ts.isIdentifier, Option.some<ts.Identifier>),
    Match.when(ts.isPropertyAccessExpression, (access) =>
      propertyAccessRootIdentifier(access.expression)
    ),
    Match.orElse(constantNoneIdentifier)
  )

const qualifiedNameRootIdentifier = (name: ts.EntityName): ts.Identifier =>
  ts.isIdentifier(name) ? name : qualifiedNameRootIdentifier(name.left)

const propertyAccessForbiddenSubject = (
  context: CheckContext,
  current: ts.PropertyAccessExpression,
  referencesBinding: (candidate: ts.Identifier) => boolean
) =>
  pipe(
    propertyAccessRootIdentifier(current.expression),
    Option.filter(referencesBinding),
    Option.flatMap(() => importedMemberAt(context.checker, current)),
    Option.filter((member) => isForbiddenDomainMember(member.moduleSpecifier, member.path)),
    Option.map(Struct.get("moduleSpecifier"))
  )

const qualifiedNameForbiddenSubject = (
  context: CheckContext,
  current: ts.QualifiedName,
  referencesBinding: (candidate: ts.Identifier) => boolean
): Option.Option<string> => {
  const root = qualifiedNameRootIdentifier(current)

  if (!referencesBinding(root)) {
    return Option.none()
  }

  return pipe(
    importedTypeMemberAt(context.checker, current),
    Option.filter((member) => isForbiddenDomainMember(member.moduleSpecifier, member.path)),
    Option.map(Struct.get("moduleSpecifier"))
  )
}

const bareBindingForbiddenSubject = (binding: Option.Option<ImportedMember>) =>
  pipe(
    binding,
    Option.filter((member) => isForbiddenDomainMember(member.moduleSpecifier, member.path)),
    Option.map(Struct.get("moduleSpecifier"))
  )

const identifierIsPropertyAccessRoot = (parent: ts.Node, current: ts.Identifier) =>
  pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(parent),
    Option.exists((access) => access.expression === current)
  )

const identifierIsQualifiedNameRoot = (parent: ts.Node, current: ts.Identifier) =>
  pipe(
    Option.liftPredicate(ts.isQualifiedName)(parent),
    Option.exists((qualified) => qualified.left === current)
  )

const namespaceBindingSubject = (context: CheckContext, identifier: ts.Identifier) => {
  const symbolAtIdentifier = context.checker.getSymbolAtLocation(identifier)
  const bindingSymbolOption = Option.fromNullishOr(symbolAtIdentifier)
  const binding = importedMemberAt(context.checker, identifier)

  return pipe(
    Option.all({ bindingSymbol: bindingSymbolOption, binding }),
    Option.flatMap(({ bindingSymbol }) => {
      const referencesBinding = (candidate: ts.Identifier) =>
        context.checker.getSymbolAtLocation(candidate) === bindingSymbol

      const subjectFromIdentifier = (current: ts.Identifier): Option.Option<string> => {
        const isSelf = current === identifier
        const unbound = referencesBinding(current) === false
        const skipChecks = Array.make(isSelf, unbound)

        if (Array.some(skipChecks, Boolean)) {
          return Option.none()
        }

        const parent = current.parent
        const isPropertyRoot = identifierIsPropertyAccessRoot(parent, current)
        const isQualifiedRoot = identifierIsQualifiedNameRoot(parent, current)
        const memberAccessRoots = Array.make(isPropertyRoot, isQualifiedRoot)
        const isMemberAccessRoot = Array.some(memberAccessRoots, Boolean)

        return isMemberAccessRoot ? Option.none() : bareBindingForbiddenSubject(binding)
      }

      const fold = foldAst(
        (subject: Option.Option<string>, current: ts.Node): Option.Option<string> => {
          if (Option.isSome(subject)) {
            return subject
          }

          return pipe(
            Match.value(current),
            Match.when(ts.isPropertyAccessExpression, (access) =>
              propertyAccessForbiddenSubject(context, access, referencesBinding)
            ),
            Match.when(ts.isQualifiedName, (qualified) =>
              qualifiedNameForbiddenSubject(context, qualified, referencesBinding)
            ),
            Match.when(ts.isIdentifier, subjectFromIdentifier),
            Match.orElse(constantNoneString)
          )
        }
      )

      return fold(context.sourceFile)(noneString)
    })
  )
}

const forbiddenDomainMemberAt = (
  context: CheckContext,
  identifier: ts.Identifier,
  inspectNamespaceUsage: boolean
) =>
  pipe(
    importedMemberAt(context.checker, identifier),
    Option.flatMap((member) => {
      const isNamespaceBinding = member.path.length === 0
      const inspectFlags = Array.make(inspectNamespaceUsage, isNamespaceBinding)
      const shouldInspectNamespace = Array.every(inspectFlags, Boolean)

      if (shouldInspectNamespace) {
        return namespaceBindingSubject(context, identifier)
      }

      return pipe(
        Option.some(member),
        Option.filter((candidate) =>
          isForbiddenDomainMember(candidate.moduleSpecifier, candidate.path)
        ),
        Option.map(Struct.get("moduleSpecifier"))
      )
    })
  )

const importBindingIdentifiers = (
  declaration: ts.ImportDeclaration
): ReadonlyArray<ts.Identifier> => {
  const importClauseOption = Option.fromNullishOr(declaration.importClause)

  if (Option.isNone(importClauseOption)) {
    return emptyIdentifiers
  }

  const importClause = importClauseOption.value
  const defaultBinding = pipe(Option.fromNullishOr(importClause.name), Option.toArray)
  const namedBindingsOption = Option.fromNullishOr(importClause.namedBindings)

  if (Option.isNone(namedBindingsOption)) {
    return defaultBinding
  }

  const namedBindings = namedBindingsOption.value

  const named = ts.isNamespaceImport(namedBindings)
    ? Array.of(namedBindings.name)
    : Array.map(namedBindings.elements, Struct.get("name"))

  return Array.appendAll(defaultBinding, named)
}

const firstForbiddenDomainMember = (
  context: CheckContext,
  identifiers: ReadonlyArray<ts.Identifier>,
  inspectNamespaceUsage: boolean
) =>
  pipe(
    identifiers,
    Array.map((identifier) => forbiddenDomainMemberAt(context, identifier, inspectNamespaceUsage)),
    Array.findFirst(Option.isSome),
    Option.flatten
  )

const forbiddenDomainImport = (context: CheckContext, declaration: ts.ImportDeclaration) => {
  const identifiers = importBindingIdentifiers(declaration)
  return firstForbiddenDomainMember(context, identifiers, true)
}

const architectureImportElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.ImportDeclaration): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return emptyDetections
    }

    const resolvedRole = role.value

    const targetRole = pipe(
      resolvedModuleSourceFile(context, node),
      Option.flatMap((sourceFile) => roleForSourceFile(index, sourceFile))
    )

    const directionDetection = pipe(
      targetRole,
      Option.filter((target) => !canImportRole(resolvedRole, target)),
      Option.map((target) => {
        const subject = `${resolvedRole} -> ${target}`
        const targetOption = Option.some(target)

        return boundaryDetection(
          context,
          node.moduleSpecifier,
          resolvedRole,
          "dependency-direction",
          subject,
          targetOption
        )
      }),
      Option.toArray
    )

    const domainDetection =
      resolvedRole === "domain"
        ? pipe(
            forbiddenDomainImport(context, node),
            Option.map((subject) =>
              boundaryDetection(
                context,
                node.moduleSpecifier,
                resolvedRole,
                "domain-effect-program",
                subject
              )
            ),
            Option.toArray
          )
        : emptyDetections

    const importProvidesRuntime = importHasRuntimeValue(node)
    const roleForbidsCapability = capabilityForbiddenRoles[resolvedRole]

    const moduleCapability = pipe(
      moduleSpecifierText(node),
      Option.filter(Function.constant(importProvidesRuntime)),
      Option.filter((subject) => moduleMatchesPolicyPrefix(index.policy, subject))
    )

    const barrelCapability = importProvidesRuntime
      ? pipe(
          importBindingIdentifiers(node),
          Array.map((identifier) =>
            pipe(
              importedMemberAt(context.checker, identifier),
              Option.filter(importedMemberIsMovedPlatformCapability),
              Option.map((member) => `${member.moduleSpecifier}:${Array.join(member.path, ".")}`)
            )
          ),
          Array.findFirst(Option.isSome),
          Option.flatten
        )
      : Option.none()

    const capabilityDetection = pipe(
      moduleCapability,
      Option.orElse(Function.constant(barrelCapability)),
      Option.filter(Function.constant(roleForbidsCapability)),
      Option.map((subject) =>
        boundaryDetection(context, node.moduleSpecifier, resolvedRole, "direct-capability", subject)
      ),
      Option.toArray
    )

    const domainAndCapability = Array.appendAll(domainDetection, capabilityDetection)
    return Array.appendAll(directionDetection, domainAndCapability)
  }

const exportBindingIdentifiers = (
  declaration: ts.ExportDeclaration
): ReadonlyArray<ts.Identifier> => {
  const exportClauseOption = Option.fromNullishOr(declaration.exportClause)

  if (Option.isNone(exportClauseOption)) {
    return emptyIdentifiers
  }

  const exportClause = exportClauseOption.value

  const names = ts.isNamespaceExport(exportClause)
    ? Array.of(exportClause.name)
    : Array.map(exportClause.elements, Struct.get("name"))

  return Array.filter(names, ts.isIdentifier)
}

const forbiddenDomainExport = (context: CheckContext, declaration: ts.ExportDeclaration) => {
  const exportClauseOption = Option.fromNullishOr(declaration.exportClause)

  if (Option.isNone(exportClauseOption)) {
    return pipe(
      moduleSpecifierText(declaration),
      Option.filter((moduleSpecifier) => isForbiddenDomainMember(moduleSpecifier, emptyPath))
    )
  }

  const identifiers = exportBindingIdentifiers(declaration)
  return firstForbiddenDomainMember(context, identifiers, false)
}

const exportElementIsValue = (element: ts.ExportSpecifier) => element.isTypeOnly === false

const exportClauseAllowsRuntime = (exportClause: ts.NamedExportBindings) =>
  pipe(
    Match.value(exportClause),
    Match.when(ts.isNamespaceExport, Function.constTrue),
    Match.when(ts.isNamedExports, (named) => Array.some(named.elements, exportElementIsValue)),
    Match.exhaustive
  )

const exportHasRuntimeValue = (declaration: ts.ExportDeclaration) => {
  const isValueExport = declaration.isTypeOnly === false
  const exportClauseOption = Option.fromNullishOr(declaration.exportClause)

  const clauseAllowsRuntime = Option.match(exportClauseOption, {
    onNone: Function.constTrue,
    onSome: exportClauseAllowsRuntime
  })

  const runtimeChecks = Array.make(isValueExport, clauseAllowsRuntime)
  return Array.every(runtimeChecks, Boolean)
}

const architectureExportElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.ExportDeclaration): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)
    const moduleSpecifierOption = Option.fromNullishOr(node.moduleSpecifier)
    const exportInputs = Option.all({ role, moduleSpecifier: moduleSpecifierOption })

    if (Option.isNone(exportInputs)) {
      return emptyDetections
    }

    const resolvedRole = exportInputs.value.role
    const resolvedModuleSpecifier = exportInputs.value.moduleSpecifier

    const targetRole = pipe(
      resolvedModuleSourceFile(context, node),
      Option.flatMap((sourceFile) => roleForSourceFile(index, sourceFile))
    )

    const directionDetection = pipe(
      targetRole,
      Option.filter((target) => !canImportRole(resolvedRole, target)),
      Option.map((target) => {
        const subject = `${resolvedRole} -> ${target}`
        const targetOption = Option.some(target)

        return boundaryDetection(
          context,
          resolvedModuleSpecifier,
          resolvedRole,
          "dependency-direction",
          subject,
          targetOption
        )
      }),
      Option.toArray
    )

    const domainDetection =
      resolvedRole === "domain"
        ? pipe(
            forbiddenDomainExport(context, node),
            Option.map((subject) =>
              boundaryDetection(
                context,
                resolvedModuleSpecifier,
                resolvedRole,
                "domain-effect-program",
                subject
              )
            ),
            Option.toArray
          )
        : emptyDetections

    const exportProvidesRuntime = exportHasRuntimeValue(node)
    const roleForbidsCapability = capabilityForbiddenRoles[resolvedRole]

    const moduleCapability = pipe(
      moduleSpecifierText(node),
      Option.filter(Function.constant(exportProvidesRuntime)),
      Option.filter((subject) => moduleMatchesPolicyPrefix(index.policy, subject))
    )

    const barrelCapability = exportProvidesRuntime
      ? pipe(
          exportBindingIdentifiers(node),
          Array.map((identifier) =>
            pipe(
              importedMemberAt(context.checker, identifier),
              Option.filter(importedMemberIsMovedPlatformCapability),
              Option.map((member) => `${member.moduleSpecifier}:${Array.join(member.path, ".")}`)
            )
          ),
          Array.findFirst(Option.isSome),
          Option.flatten
        )
      : Option.none()

    const capabilityDetection = pipe(
      moduleCapability,
      Option.orElse(Function.constant(barrelCapability)),
      Option.filter(Function.constant(roleForbidsCapability)),
      Option.map((subject) =>
        boundaryDetection(
          context,
          resolvedModuleSpecifier,
          resolvedRole,
          "direct-capability",
          subject
        )
      ),
      Option.toArray
    )

    const domainAndCapability = Array.appendAll(domainDetection, capabilityDetection)
    return Array.appendAll(directionDetection, domainAndCapability)
  }

const runtimeNames = Array.make(
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

const provideEffectNames = Array.make(
  "provide",
  "provideService",
  "provideServiceEffect",
  "provideContext"
)

const provideLayerNames = Array.make("provide", "provideMerge")

const serviceLocatorEffectNames = Array.make("context", "contextWith")

const serviceLocatorContextNames = Array.make(
  "get",
  "getOption",
  "getOrElse",
  "getUnsafe",
  "getOrUndefined",
  "getReferenceUnsafe"
)

const portLayerNames = Array.make("effect", "succeed")

const managedRuntimeMakeNames = Array.of("make")

const contextTypeNames = Array.of("Context")
const managedRuntimeTypeNames = Array.of("ManagedRuntime")

const platformRuntimePrefixes = Array.make(
  "@effect/platform-node",
  "@effect/platform-bun",
  "@effect/platform-deno",
  "@effect/platform-browser"
)

const stateConstructors: Readonly<Record<string, ReadonlyArray<string>>> = {
  Ref: Array.of("makeUnsafe"),
  SynchronizedRef: Array.of("makeUnsafe"),
  Latch: Array.of("makeUnsafe"),
  Semaphore: Array.of("makeUnsafe")
}

const stateConstructorEntries = EffectRecord.toEntries(stateConstructors)

const callIsRuntimeExecution = (context: CheckContext, node: ts.CallExpression) => {
  const directEffect = importedEffectApiAt(context.checker, node.expression, "Effect", runtimeNames)

  const managedRuntimeMethod = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(node.expression),
    Option.exists((expression) =>
      isManagedRuntimeMethodAccess(context.checker, expression, runtimeNames)
    )
  )

  const pipeRuntimeHandoff = callIsPipeRuntimeHandoff(context.checker, node, runtimeNames)

  const runMain = pipe(
    importedMemberAt(context.checker, node.expression),
    Option.exists((member) => {
      const emptyName = Function.constant("")
      const name = pipe(Array.last(member.path), Option.getOrElse(emptyName))

      const platformRuntime = Array.some(platformRuntimePrefixes, (prefix) =>
        member.moduleSpecifier.startsWith(prefix)
      )

      const isRunMain = name === "runMain"
      return platformRuntime && isRunMain
    })
  )

  const checks = Array.make(directEffect, managedRuntimeMethod, pipeRuntimeHandoff, runMain)

  return Array.some(checks, Boolean)
}

const callIsProvisioning = (context: CheckContext, node: ts.CallExpression) => {
  const effectProvide = importedEffectApiAt(
    context.checker,
    node.expression,
    "Effect",
    provideEffectNames
  )

  const referenceOverride = callIsReferenceProvideService(context.checker, node)
  const needsProvisioning = referenceOverride === false
  const effectProvisioningChecks = Array.make(effectProvide, needsProvisioning)
  const effectProvisioning = Array.every(effectProvisioningChecks, Boolean)

  const layerProvide = importedEffectApiAt(
    context.checker,
    node.expression,
    "Layer",
    provideLayerNames
  )

  const managedRuntimeMake = importedEffectApiAt(
    context.checker,
    node.expression,
    "ManagedRuntime",
    managedRuntimeMakeNames
  )

  const checks = Array.make(effectProvisioning, layerProvide, managedRuntimeMake)
  return Array.some(checks, Boolean)
}

const callIsServiceLocator = (context: CheckContext, node: ts.CallExpression) => {
  const effectContext = importedEffectApiAt(
    context.checker,
    node.expression,
    "Effect",
    serviceLocatorEffectNames
  )

  const contextLookup = importedEffectApiAt(
    context.checker,
    node.expression,
    "Context",
    serviceLocatorContextNames
  )

  const checks = Array.make(effectContext, contextLookup)
  return Array.some(checks, Boolean)
}

const callIsPortLayer = (context: CheckContext, node: ts.CallExpression) =>
  importedEffectApiAt(context.checker, node.expression, "Layer", portLayerNames)

const callIsEscapingState = (context: CheckContext, node: ts.CallExpression) =>
  Array.some(stateConstructorEntries, ([namespace, names]) =>
    importedEffectApiAt(context.checker, node.expression, namespace, names)
  )

const detectionWhen = (
  shouldDetect: boolean,
  detectionValue: Detection
): ReadonlyArray<Detection> => (shouldDetect ? Array.of(detectionValue) : emptyDetections)

const callExpressionElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.CallExpression): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return emptyDetections
    }

    const resolvedRole = role.value

    if (resolvedRole === "test") {
      return emptyDetections
    }

    const expressionText = node.expression.getText()
    const fallbackSubject = Function.constant(expressionText)

    const subject = pipe(
      importedMemberAt(context.checker, node.expression),
      Option.map((member) => `${member.moduleSpecifier}:${Array.join(member.path, ".")}`),
      Option.getOrElse(fallbackSubject)
    )

    const notRoot = resolvedRole !== "root"
    const isRuntimeExecution = callIsRuntimeExecution(context, node)
    const shouldReportRuntime = notRoot && isRuntimeExecution

    const runtimeDetection = boundaryDetection(
      context,
      node.expression,
      resolvedRole,
      "runtime-execution",
      subject
    )

    const runtime = detectionWhen(shouldReportRuntime, runtimeDetection)
    const isProvisioning = callIsProvisioning(context, node)
    const shouldReportProvisioning = notRoot && isProvisioning

    const provisioningDetection = boundaryDetection(
      context,
      node.expression,
      resolvedRole,
      "dependency-provisioning",
      subject
    )

    const provisioning = detectionWhen(shouldReportProvisioning, provisioningDetection)
    const isPort = resolvedRole === "port"
    const isPortLayerCall = callIsPortLayer(context, node)
    const shouldReportPortLayer = isPort && isPortLayerCall

    const portLayerDetection = boundaryDetection(
      context,
      node.expression,
      resolvedRole,
      "port-live-implementation",
      subject
    )

    const portLayer = detectionWhen(shouldReportPortLayer, portLayerDetection)
    const isServiceLocatorCall = callIsServiceLocator(context, node)
    const shouldReportServiceLocator = notRoot && isServiceLocatorCall

    const serviceLocatorDetection = boundaryDetection(
      context,
      node.expression,
      resolvedRole,
      "service-locator",
      subject
    )

    const serviceLocator = detectionWhen(shouldReportServiceLocator, serviceLocatorDetection)
    const importedExpression = importedMemberAt(context.checker, node.expression)
    const expressionNotImported = Option.isNone(importedExpression)
    const roleForbidsCapability = capabilityForbiddenRoles[resolvedRole]
    const adapterOrRoot = isAdapterOrRootRole(resolvedRole)

    const ambientCapability = pipe(
      capabilitySubjectAt(context, index.policy, node),
      Option.filter(Function.constant(expressionNotImported))
    )

    const directCapability = pipe(
      ambientCapability,
      Option.filter(Function.constant(roleForbidsCapability)),
      Option.map((capability) =>
        boundaryDetection(context, node.expression, resolvedRole, "direct-capability", capability)
      ),
      Option.toArray
    )

    const hasSuspension = hasSuspensionBoundary(context.checker, node)
    const lacksSuspension = hasSuspension === false

    const unsuspended = pipe(
      capabilitySubjectAt(context, index.policy, node),
      Option.filter(Function.constant(adapterOrRoot)),
      Option.filter(Function.constant(lacksSuspension)),
      Option.map((capability) =>
        boundaryDetection(
          context,
          node.expression,
          resolvedRole,
          "unsuspended-adapter-effect",
          capability
        )
      ),
      Option.toArray
    )

    const hasScopedLifecycle = hasScopedLifecycleAncestor(context.checker, node)
    const fileScopesFunction = sourceFileScopesFunction(context, node)
    const lacksScopedLifecycle = hasScopedLifecycle === false
    const lacksFileScope = fileScopesFunction === false
    const unscopedChecks = Array.make(lacksScopedLifecycle, lacksFileScope)
    const unscoped = Array.every(unscopedChecks, Boolean)

    const unscopedResource = pipe(
      resourceSubjectAt(context, index.policy, node),
      Option.filter(Function.constant(adapterOrRoot)),
      Option.filter(Function.constant(unscoped)),
      Option.map((resource) =>
        boundaryDetection(context, node.expression, resolvedRole, "unscoped-resource", resource)
      ),
      Option.toArray
    )

    const isEscapingState = callIsEscapingState(context, node)

    const escapingStateConditions = Array.make(
      isEscapingState,
      lacksScopedLifecycle,
      lacksFileScope
    )

    const shouldReportEscaping = Array.every(escapingStateConditions, Boolean)

    const escapingStateDetection = boundaryDetection(
      context,
      node.expression,
      resolvedRole,
      "escaping-runtime-state",
      subject
    )

    const escapingState = detectionWhen(shouldReportEscaping, escapingStateDetection)

    const groups = Array.make(
      runtime,
      provisioning,
      portLayer,
      serviceLocator,
      directCapability,
      unsuspended,
      unscopedResource,
      escapingState
    )

    return Array.flatten(groups)
  }

const newExpressionElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.NewExpression): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return emptyDetections
    }

    const resolvedRole = role.value

    if (resolvedRole === "test") {
      return emptyDetections
    }

    const capability = capabilitySubjectAt(context, index.policy, node)
    const roleForbidsCapability = capabilityForbiddenRoles[resolvedRole]
    const adapterOrRoot = isAdapterOrRootRole(resolvedRole)
    const hasSuspension = hasSuspensionBoundary(context.checker, node)
    const lacksSuspension = hasSuspension === false

    const directCapability = pipe(
      capability,
      Option.filter(Function.constant(roleForbidsCapability)),
      Option.map((subject) =>
        boundaryDetection(context, node.expression, resolvedRole, "direct-capability", subject)
      ),
      Option.toArray
    )

    const unsuspended = pipe(
      capability,
      Option.filter(Function.constant(adapterOrRoot)),
      Option.filter(Function.constant(lacksSuspension)),
      Option.map((subject) =>
        boundaryDetection(
          context,
          node.expression,
          resolvedRole,
          "unsuspended-adapter-effect",
          subject
        )
      ),
      Option.toArray
    )

    const hasScopedLifecycle = hasScopedLifecycleAncestor(context.checker, node)
    const fileScopesFunction = sourceFileScopesFunction(context, node)
    const lacksScopedLifecycle = hasScopedLifecycle === false
    const lacksFileScope = fileScopesFunction === false
    const unscopedChecks = Array.make(lacksScopedLifecycle, lacksFileScope)
    const unscoped = Array.every(unscopedChecks, Boolean)

    const unscopedDetections = pipe(
      resourceSubjectAt(context, index.policy, node),
      Option.filter(Function.constant(adapterOrRoot)),
      Option.filter(Function.constant(unscoped)),
      Option.map((subject) =>
        boundaryDetection(context, node.expression, resolvedRole, "unscoped-resource", subject)
      ),
      Option.toArray
    )

    const groups = Array.make(directCapability, unsuspended, unscopedDetections)
    return Array.flatten(groups)
  }

const propertyAccessElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.PropertyAccessExpression): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return emptyDetections
    }

    const resolvedRole = role.value

    if (resolvedRole === "test") {
      return emptyDetections
    }

    const ambient = ambientCapabilityPropertySubject(context, node)
    const roleForbidsCapability = capabilityForbiddenRoles[resolvedRole]
    const adapterOrRoot = isAdapterOrRootRole(resolvedRole)
    const hasSuspension = hasSuspensionBoundary(context.checker, node)
    const lacksSuspension = hasSuspension === false

    const directCapability = pipe(
      ambient,
      Option.filter(Function.constant(roleForbidsCapability)),
      Option.map((subject) =>
        boundaryDetection(context, node, resolvedRole, "direct-capability", subject)
      ),
      Option.toArray
    )

    const unsuspended = pipe(
      ambient,
      Option.filter(Function.constant(adapterOrRoot)),
      Option.filter(Function.constant(lacksSuspension)),
      Option.map((subject) =>
        boundaryDetection(context, node, resolvedRole, "unsuspended-adapter-effect", subject)
      ),
      Option.toArray
    )

    const layerSelection = pipe(
      Option.liftPredicate((access: ts.PropertyAccessExpression) => access.name.text === "layer")(
        node
      ),
      Option.flatMap((access) => {
        const expressionSymbol = context.checker.getSymbolAtLocation(access.expression)
        const symbolOption = Option.fromNullishOr(expressionSymbol)

        const resolvedSymbol = pipe(
          symbolOption,
          Option.map((symbol) => {
            const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0
            return isAlias ? context.checker.getAliasedSymbol(symbol) : symbol
          })
        )

        const emptyDeclarationsFallback = Function.constant(emptyDeclarations)

        const declarations = pipe(
          resolvedSymbol,
          Option.map((symbol) => symbol.declarations ?? emptyDeclarations),
          Option.getOrElse(emptyDeclarationsFallback)
        )

        return Array.findFirst(declarations, (declaration) =>
          declarationIsContextService(context.checker, declaration)
        )
      }),
      Option.filter(Function.constant(resolvedRole !== "root")),
      Option.map(() => {
        const subject = node.getText()
        return boundaryDetection(context, node, resolvedRole, "dependency-provisioning", subject)
      }),
      Option.toArray
    )

    const groups = Array.make(directCapability, unsuspended, layerSelection)
    return Array.flatten(groups)
  }

const classDeclarationElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.ClassDeclaration): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return emptyDetections
    }

    const resolvedRole = role.value

    if (resolvedRole !== "port") {
      return emptyDetections
    }

    const serviceConfig = effectServiceConfigObject(context.checker, node)
    const liveService = Option.isSome(serviceConfig)

    if (!liveService) {
      return emptyDetections
    }

    const nodeFallback = Function.constant(node)
    const target = pipe(Option.fromNullishOr(node.name), Option.getOrElse(nodeFallback))
    const targetText = target.getText()

    const liveImplementation = boundaryDetection(
      context,
      target,
      resolvedRole,
      "port-live-implementation",
      targetText
    )

    const embeddedLayer = pipe(
      contextServiceLayerProperty(node),
      Option.map((property) => {
        const subject = `${targetText}.${property.name.getText()}`
        return boundaryDetection(
          context,
          property.name,
          resolvedRole,
          "port-live-implementation",
          subject
        )
      }),
      Option.toArray
    )

    return Array.prepend(embeddedLayer, liveImplementation)
  }

const variableDeclarationElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.VariableDeclaration): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return emptyDetections
    }

    const resolvedRole = role.value

    if (resolvedRole !== "port") {
      return emptyDetections
    }

    const serviceConfig = pipe(
      Option.fromNullishOr(node.initializer),
      Option.flatMap((expression) => effectServiceConfigFromExpression(context.checker, expression))
    )

    if (Option.isNone(serviceConfig)) {
      return emptyDetections
    }

    const targetText = node.name.getText()

    const liveImplementation = boundaryDetection(
      context,
      node.name,
      resolvedRole,
      "port-live-implementation",
      targetText
    )

    return Array.of(liveImplementation)
  }

const forbiddenContractEffectNamespaces: Readonly<Record<string, true>> = {
  Ref: true,
  SynchronizedRef: true,
  Queue: true,
  PubSub: true,
  SubscriptionRef: true,
  References: true,
  Runtime: true,
  ManagedRuntime: true,
  Latch: true,
  Semaphore: true
}

const effectNamespaceFromMember = (member: ImportedMember) =>
  pipe(
    Option.liftPredicate((specifier: string) => specifier === "effect")(member.moduleSpecifier),
    Option.map(() => member.path[0] ?? ""),
    Option.orElse(() =>
      pipe(
        Option.liftPredicate((specifier: string) => specifier.startsWith("effect/"))(
          member.moduleSpecifier
        ),
        Option.map((specifier) => specifier.slice("effect/".length).split("/")[0])
      )
    ),
    Option.getOrElse(Function.constant(""))
  )

const typeReferenceSubject = (
  context: CheckContext,
  policy: FunctionalCoreEffectPolicy,
  node: ts.TypeReferenceNode,
  visited: ReadonlyArray<ts.Symbol> = emptySymbols
): Option.Option<string> => {
  if (typeReferenceIsGlobalPromise(context, node)) {
    return Option.some("Promise")
  }

  const direct = pipe(
    importedTypeMemberAt(context.checker, node.typeName),
    Option.filter((member) => {
      const effectNamespace = effectNamespaceFromMember(member)
      const stateOrRuntime = forbiddenContractEffectNamespaces[effectNamespace] === true
      const capability = moduleMatchesPolicyPrefix(policy, member.moduleSpecifier)
      const emptyName = Function.constant("")
      const typeName = pipe(Array.last(member.path), Option.getOrElse(emptyName))

      const infrastructureSuffix = Array.some(policy.resourceTypeSuffixes, (suffix) =>
        typeName.endsWith(suffix)
      )

      const checks = Array.make(stateOrRuntime, capability, infrastructureSuffix)
      return Array.some(checks, Boolean)
    }),
    Option.map((member) => `${member.moduleSpecifier}:${Array.join(member.path, ".")}`)
  )

  if (Option.isSome(direct)) {
    return direct
  }

  const typeNameSymbol = context.checker.getSymbolAtLocation(node.typeName)
  const symbolOption = Option.fromNullishOr(typeNameSymbol)

  return pipe(
    symbolOption,
    Option.filter((symbol) => Array.some(visited, (candidate) => candidate === symbol) === false),
    Option.map((symbol) => {
      const nextVisited = Array.append(visited, symbol)
      const targets = localTypeReferenceTargets(context.checker, node)

      return pipe(
        targets,
        Array.map((target) => typeReferenceSubject(context, policy, target, nextVisited)),
        Array.findFirst(Option.isSome),
        Option.flatten
      )
    }),
    Option.flatten
  )
}

const typeIsServiceLocator = (
  context: CheckContext,
  node: ts.TypeReferenceNode,
  visited: ReadonlyArray<ts.Symbol> = emptySymbols
): boolean => {
  const direct = pipe(
    importedTypeMemberAt(context.checker, node.typeName),
    Option.exists((member) => {
      const contextType = effectApiMember(member, "Context", contextTypeNames)
      const managedRuntimeType = effectApiMember(member, "ManagedRuntime", managedRuntimeTypeNames)
      const checks = Array.make(contextType, managedRuntimeType)
      return Array.some(checks, Boolean)
    })
  )

  const typeNameSymbol = context.checker.getSymbolAtLocation(node.typeName)
  const unresolvedSymbolOption = Option.fromNullishOr(typeNameSymbol)

  const symbolOption = pipe(
    unresolvedSymbolOption,
    Option.map((unresolvedSymbol) => {
      const isAlias = (unresolvedSymbol.flags & ts.SymbolFlags.Alias) !== 0
      return isAlias ? context.checker.getAliasedSymbol(unresolvedSymbol) : unresolvedSymbol
    })
  )

  const alreadyVisited = pipe(
    symbolOption,
    Option.exists((symbol) => Array.some(visited, (candidate) => candidate === symbol))
  )

  const notVisited = alreadyVisited === false

  const nested = pipe(
    symbolOption,
    Option.filter(Function.constant(notVisited)),
    Option.map((symbol) => {
      const nextVisited = Array.append(visited, symbol)
      const targets = localTypeReferenceTargets(context.checker, node)

      const targetIsServiceLocator = (target: ts.TypeReferenceNode) =>
        typeIsServiceLocator(context, target, nextVisited)

      return Array.some(targets, targetIsServiceLocator)
    }),
    Option.getOrElse(Function.constFalse)
  )

  const checks = Array.make(direct, nested)
  return Array.some(checks, Boolean)
}

const typeReferenceElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.TypeReferenceNode): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return emptyDetections
    }

    const resolvedRole = role.value
    const isTestRole = resolvedRole === "test"
    const isRootRole = resolvedRole === "root"
    const skippedRoles = Array.make(isTestRole, isRootRole)

    if (Array.some(skippedRoles, Boolean)) {
      return emptyDetections
    }

    const typeNameText = node.typeName.getText()
    const isServiceLocatorType = typeIsServiceLocator(context, node)

    const serviceLocatorDetection = boundaryDetection(
      context,
      node.typeName,
      resolvedRole,
      "service-locator",
      typeNameText
    )

    const serviceLocator = detectionWhen(isServiceLocatorType, serviceLocatorDetection)
    const isPortRole = resolvedRole === "port"
    const isTopLevelExport = isTopLevelExportedDeclaration(node)
    const shouldCheckInfrastructure = isPortRole && isTopLevelExport

    const infrastructureContract = shouldCheckInfrastructure
      ? pipe(
          typeReferenceSubject(context, index.policy, node),
          Option.map((subject) =>
            boundaryDetection(
              context,
              node.typeName,
              resolvedRole,
              "infrastructure-contract",
              subject
            )
          ),
          Option.toArray
        )
      : emptyDetections

    const isDomainRole = resolvedRole === "domain"
    const isGlobalPromise = typeReferenceIsGlobalPromise(context, node)
    const shouldCheckDomainPromise = isDomainRole && isGlobalPromise

    const domainPromiseDetection = boundaryDetection(
      context,
      node.typeName,
      resolvedRole,
      "domain-effect-program",
      "Promise"
    )

    const domainPromise = detectionWhen(shouldCheckDomainPromise, domainPromiseDetection)
    const groups = Array.make(serviceLocator, infrastructureContract, domainPromise)
    return Array.flatten(groups)
  }

const asyncKeywordElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.Node): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return emptyDetections
    }

    const resolvedRole = role.value

    if (resolvedRole !== "domain") {
      return emptyDetections
    }

    const domainPromise = boundaryDetection(
      context,
      node,
      resolvedRole,
      "domain-effect-program",
      "Promise"
    )

    return Array.of(domainPromise)
  }

const isAsyncKeyword = (node: ts.Node): node is ts.Node => node.kind === ts.SyntaxKind.AsyncKeyword

const exportKinds = Array.of(ts.SyntaxKind.ExportDeclaration)
const asyncKeywordKinds = Array.of(ts.SyntaxKind.AsyncKeyword)
const importKinds = Array.of(ts.SyntaxKind.ImportDeclaration)
const callKinds = Array.of(ts.SyntaxKind.CallExpression)
const newKinds = Array.of(ts.SyntaxKind.NewExpression)
const propertyKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)
const classKinds = Array.of(ts.SyntaxKind.ClassDeclaration)
const variableKinds = Array.of(ts.SyntaxKind.VariableDeclaration)
const typeReferenceKinds = Array.of(ts.SyntaxKind.TypeReference)

const subscriptionsFor = (index: FunctionalCoreEffectIndex): ReadonlyArray<Subscription> => {
  const importElements = architectureImportElements(index)
  const exportElements = architectureExportElements(index)
  const callElements = callExpressionElements(index)
  const newElements = newExpressionElements(index)
  const propertyElements = propertyAccessElements(index)
  const classElements = classDeclarationElements(index)
  const variableElements = variableDeclarationElements(index)
  const typeReferenceElementsForIndex = typeReferenceElements(index)
  const asyncElements = asyncKeywordElements(index)
  const importSubscriptions = nodeSubscriptions(importKinds)(ts.isImportDeclaration)(importElements)
  const exportSubscriptions = nodeSubscriptions(exportKinds)(ts.isExportDeclaration)(exportElements)
  const callSubscriptions = nodeSubscriptions(callKinds)(ts.isCallExpression)(callElements)
  const newSubscriptions = nodeSubscriptions(newKinds)(ts.isNewExpression)(newElements)

  const propertySubscriptions = nodeSubscriptions(propertyKinds)(ts.isPropertyAccessExpression)(
    propertyElements
  )

  const classSubscriptions = nodeSubscriptions(classKinds)(ts.isClassDeclaration)(classElements)

  const variableSubscriptions = nodeSubscriptions(variableKinds)(ts.isVariableDeclaration)(
    variableElements
  )

  const typeReferenceSubscriptions = nodeSubscriptions(typeReferenceKinds)(ts.isTypeReferenceNode)(
    typeReferenceElementsForIndex
  )

  const asyncSubscriptions = nodeSubscriptions(asyncKeywordKinds)(isAsyncKeyword)(asyncElements)

  const groups = Array.make(
    importSubscriptions,
    exportSubscriptions,
    callSubscriptions,
    newSubscriptions,
    propertySubscriptions,
    classSubscriptions,
    variableSubscriptions,
    typeReferenceSubscriptions,
    asyncSubscriptions
  )

  return Array.flatten(groups)
}

export const makeFunctionalCoreEffect = (policy: FunctionalCoreEffectPolicy) => {
  const indexBuilder = buildFunctionalCoreEffectIndex(policy)
  const withIndex = withProgramIndex(indexBuilder)
  return withIndex(subscriptionsFor)
}
