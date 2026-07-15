import { Array, Function, Option, Record as EffectRecord, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeSubscriptions, withProgramIndex } from "@better-typescript/core/engine/check"
import { foldAst } from "@better-typescript/core/engine/sources"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check, Subscription } from "@better-typescript/core/engine/check/data"
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
import {
  ambientCapabilityPropertySubject,
  capabilitySubjectAt,
  classExtendsEffectApi,
  effectApiMember,
  effectServiceDependencyProperty,
  hasEffectCallAncestor,
  hasScopedLifecycleAncestor,
  hasSuspensionBoundary,
  importHasRuntimeValue,
  importedEffectApiAt,
  importedMemberAt,
  importedTypeMemberAt,
  localTypeReferenceTargets,
  isManagedRuntimeMethodAccess,
  isTopLevelExportedDeclaration,
  moduleMatchesPolicyPrefix,
  moduleSpecifierText,
  resolvedModuleSourceFile,
  resourceSubjectAt,
  sourceFileScopesFunction,
  typeReferenceIsGlobalPromise
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
  "unscoped-resource":
    "Acquire this external resource in a scoped Layer or acquireRelease lifecycle.",
  "escaping-runtime-state":
    "Create shared Effect state inside a scoped service Layer instead of letting it escape."
}

const hintByKind: Readonly<Record<FunctionalCoreBoundaryKind, string>> = {
  "dependency-direction":
    "Move the dependency behind a domain-owned port, or move this behaviour to the outer role that owns the implementation.",
  "domain-effect-program":
    "Return an immutable domain decision from a plain function; let application code translate the decision into Effect operations.",
  "direct-capability":
    "Declare a Context.Tag port with domain inputs and outputs, then implement it with a Layer in an adapter.",
  "runtime-execution":
    "Return the Effect value with its requirements visible; provide and run it once in main, bootstrap, wiring, or a test boundary.",
  "dependency-provisioning":
    "Leave the R channel open through application code and compose Layers where the application starts.",
  "port-live-implementation":
    "Use Context.Tag for the port and export Layer.effect, Layer.scoped, or Layer.succeed from an adapter Module.",
  "infrastructure-contract":
    "Expose domain-owned values, errors, Effect, or Stream; keep SDK clients, Promise, Runtime, Ref, Queue, and PubSub private to the adapter.",
  "service-locator":
    "Yield the precise Context.Tag requirement where it is used; never pass Context.Context or a Runtime as a dependency bag.",
  "unsuspended-adapter-effect":
    "Use Effect.sync, Effect.try, Effect.tryPromise, or Effect.async around the lazy foreign call; Effect.succeed does not suspend work.",
  "unscoped-resource":
    "Pair acquisition and release with Effect.acquireRelease and expose the implementation through Layer.scoped.",
  "escaping-runtime-state":
    "Use Ref.make or the appropriate Queue/PubSub constructor while building a scoped service and keep the handle out of the port surface."
}

const boundaryDetection = (
  context: CheckContext,
  node: ts.Node,
  role: ArchitectureRole,
  kind: FunctionalCoreBoundaryKind,
  subject: string,
  targetRole?: ArchitectureRole
): Detection => {
  const data = new FunctionalCoreBoundaryData({
    kind,
    role,
    subject,
    ...(targetRole === undefined ? {} : { targetRole })
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

const canImportRole = (importer: ArchitectureRole, imported: ArchitectureRole): boolean =>
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
  FiberRef: true,
  Runtime: true,
  ManagedRuntime: true,
  Scope: true
}

const isForbiddenDomainMember = (moduleSpecifier: string, path: ReadonlyArray<string>): boolean => {
  if (moduleSpecifier.startsWith("effect/")) {
    const namespace = moduleSpecifier.slice("effect/".length).split("/")[0]
    return forbiddenDomainNamespaces[namespace] === true
  }

  if (moduleSpecifier !== "effect") {
    return false
  }

  const namespace = path[0]
  return namespace === undefined || forbiddenDomainNamespaces[namespace] === true
}

const propertyAccessRootIdentifier = (expression: ts.Expression): Option.Option<ts.Identifier> => {
  if (ts.isIdentifier(expression)) {
    return Option.some(expression)
  }

  return ts.isPropertyAccessExpression(expression)
    ? propertyAccessRootIdentifier(expression.expression)
    : Option.none()
}

const qualifiedNameRootIdentifier = (name: ts.EntityName): ts.Identifier =>
  ts.isIdentifier(name) ? name : qualifiedNameRootIdentifier(name.left)

const namespaceBindingSubject = (
  context: CheckContext,
  identifier: ts.Identifier
): Option.Option<string> => {
  const bindingSymbol = context.checker.getSymbolAtLocation(identifier)
  const binding = importedMemberAt(context.checker, identifier)

  if (bindingSymbol === undefined || Option.isNone(binding)) {
    return Option.none()
  }

  const referencesBinding = (candidate: ts.Identifier): boolean =>
    context.checker.getSymbolAtLocation(candidate) === bindingSymbol

  return foldAst((subject: Option.Option<string>, current: ts.Node): Option.Option<string> => {
    if (Option.isSome(subject)) {
      return subject
    }

    if (ts.isPropertyAccessExpression(current)) {
      return pipe(
        propertyAccessRootIdentifier(current.expression),
        Option.filter(referencesBinding),
        Option.flatMap(() => importedMemberAt(context.checker, current)),
        Option.filter((member) => isForbiddenDomainMember(member.moduleSpecifier, member.path)),
        Option.map(Struct.get("moduleSpecifier"))
      )
    }

    if (ts.isQualifiedName(current)) {
      const root = qualifiedNameRootIdentifier(current)

      return referencesBinding(root)
        ? pipe(
            importedTypeMemberAt(context.checker, current),
            Option.filter((member) => isForbiddenDomainMember(member.moduleSpecifier, member.path)),
            Option.map(Struct.get("moduleSpecifier"))
          )
        : Option.none()
    }

    if (current === identifier || !ts.isIdentifier(current) || !referencesBinding(current)) {
      return Option.none()
    }

    const parent = current.parent

    const startsPropertyAccess =
      ts.isPropertyAccessExpression(parent) && parent.expression === current

    const startsQualifiedName = ts.isQualifiedName(parent) && parent.left === current

    if (startsPropertyAccess || startsQualifiedName) {
      return Option.none()
    }

    return pipe(
      binding,
      Option.filter((member) => isForbiddenDomainMember(member.moduleSpecifier, member.path)),
      Option.map(Struct.get("moduleSpecifier"))
    )
  })(context.sourceFile)(Option.none())
}

const forbiddenDomainMemberAt = (
  context: CheckContext,
  identifier: ts.Identifier,
  inspectNamespaceUsage: boolean
): Option.Option<string> =>
  pipe(
    importedMemberAt(context.checker, identifier),
    Option.flatMap((member) =>
      inspectNamespaceUsage && member.path.length === 0
        ? namespaceBindingSubject(context, identifier)
        : pipe(
            Option.some(member),
            Option.filter((candidate) =>
              isForbiddenDomainMember(candidate.moduleSpecifier, candidate.path)
            ),
            Option.map(Struct.get("moduleSpecifier"))
          )
    )
  )

const importBindingIdentifiers = (
  declaration: ts.ImportDeclaration
): ReadonlyArray<ts.Identifier> => {
  const importClause = declaration.importClause

  if (importClause === undefined) {
    return Array.empty()
  }

  const defaultBinding = pipe(Option.fromNullable(importClause.name), Option.toArray)

  const namedBindings = importClause.namedBindings

  if (namedBindings === undefined) {
    return defaultBinding
  }

  const named = ts.isNamespaceImport(namedBindings)
    ? Array.of(namedBindings.name)
    : Array.map(namedBindings.elements, Struct.get("name"))

  return Array.appendAll(defaultBinding, named)
}

const firstForbiddenDomainMember = (
  context: CheckContext,
  identifiers: ReadonlyArray<ts.Identifier>,
  inspectNamespaceUsage: boolean
): Option.Option<string> =>
  pipe(
    identifiers,
    Array.map((identifier) => forbiddenDomainMemberAt(context, identifier, inspectNamespaceUsage)),
    Array.findFirst(Option.isSome),
    Option.flatten
  )

const forbiddenDomainImport = (
  context: CheckContext,
  declaration: ts.ImportDeclaration
): Option.Option<string> =>
  firstForbiddenDomainMember(context, importBindingIdentifiers(declaration), true)

const architectureImportElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.ImportDeclaration): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role)) {
      return Array.empty()
    }

    const targetRole = pipe(
      resolvedModuleSourceFile(context, node),
      Option.flatMap((sourceFile) => roleForSourceFile(index, sourceFile))
    )

    const directionDetection = pipe(
      targetRole,
      Option.filter((target) => !canImportRole(role.value, target)),
      Option.map((target) =>
        boundaryDetection(
          context,
          node.moduleSpecifier,
          role.value,
          "dependency-direction",
          `${role.value} -> ${target}`,
          target
        )
      ),
      Option.toArray
    )

    const domainDetection =
      role.value === "domain"
        ? pipe(
            forbiddenDomainImport(context, node),
            Option.map((subject) =>
              boundaryDetection(
                context,
                node.moduleSpecifier,
                role.value,
                "domain-effect-program",
                subject
              )
            ),
            Option.toArray
          )
        : Array.empty<Detection>()

    const capabilityDetection = pipe(
      moduleSpecifierText(node),
      Option.filter(() => importHasRuntimeValue(node)),
      Option.filter((subject) => moduleMatchesPolicyPrefix(index.policy, subject)),
      Option.filter(() => capabilityForbiddenRoles[role.value]),
      Option.map((subject) =>
        boundaryDetection(context, node.moduleSpecifier, role.value, "direct-capability", subject)
      ),
      Option.toArray
    )

    return Array.appendAll(
      directionDetection,
      Array.appendAll(domainDetection, capabilityDetection)
    )
  }

const exportBindingIdentifiers = (
  declaration: ts.ExportDeclaration
): ReadonlyArray<ts.Identifier> => {
  const exportClause = declaration.exportClause

  if (exportClause === undefined) {
    return Array.empty()
  }

  const names = ts.isNamespaceExport(exportClause)
    ? Array.of(exportClause.name)
    : Array.map(exportClause.elements, Struct.get("name"))

  return Array.filter(names, ts.isIdentifier)
}

const forbiddenDomainExport = (
  context: CheckContext,
  declaration: ts.ExportDeclaration
): Option.Option<string> => {
  if (declaration.exportClause === undefined) {
    return pipe(
      moduleSpecifierText(declaration),
      Option.filter((moduleSpecifier) => isForbiddenDomainMember(moduleSpecifier, Array.empty()))
    )
  }

  return firstForbiddenDomainMember(context, exportBindingIdentifiers(declaration), false)
}

const exportHasRuntimeValue = (declaration: ts.ExportDeclaration): boolean => {
  if (declaration.isTypeOnly) {
    return false
  }

  const exportClause = declaration.exportClause

  return (
    exportClause === undefined ||
    ts.isNamespaceExport(exportClause) ||
    Array.some(exportClause.elements, (element) => !element.isTypeOnly)
  )
}

const architectureExportElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.ExportDeclaration): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)
    const moduleSpecifier = node.moduleSpecifier

    if (Option.isNone(role) || moduleSpecifier === undefined) {
      return Array.empty()
    }

    const targetRole = pipe(
      resolvedModuleSourceFile(context, node),
      Option.flatMap((sourceFile) => roleForSourceFile(index, sourceFile))
    )

    const directionDetection = pipe(
      targetRole,
      Option.filter((target) => !canImportRole(role.value, target)),
      Option.map((target) =>
        boundaryDetection(
          context,
          moduleSpecifier,
          role.value,
          "dependency-direction",
          `${role.value} -> ${target}`,
          target
        )
      ),
      Option.toArray
    )

    const domainDetection =
      role.value === "domain"
        ? pipe(
            forbiddenDomainExport(context, node),
            Option.map((subject) =>
              boundaryDetection(
                context,
                moduleSpecifier,
                role.value,
                "domain-effect-program",
                subject
              )
            ),
            Option.toArray
          )
        : Array.empty<Detection>()

    const capabilityDetection = pipe(
      moduleSpecifierText(node),
      Option.filter(() => exportHasRuntimeValue(node)),
      Option.filter((subject) => moduleMatchesPolicyPrefix(index.policy, subject)),
      Option.filter(() => capabilityForbiddenRoles[role.value]),
      Option.map((subject) =>
        boundaryDetection(context, moduleSpecifier, role.value, "direct-capability", subject)
      ),
      Option.toArray
    )

    return Array.appendAll(
      directionDetection,
      Array.appendAll(domainDetection, capabilityDetection)
    )
  }

const runtimeNames = Array.make(
  "runCallback",
  "runFork",
  "runPromise",
  "runPromiseExit",
  "runSync",
  "runSyncExit"
)

const provideEffectNames = Array.make("provide", "provideService", "provideServiceEffect")

const provideLayerNames = Array.make("provide", "provideMerge")

const serviceLocatorEffectNames = Array.make("context", "contextWith", "contextWithEffect")

const serviceLocatorContextNames = Array.make("get", "getOption", "getOrElse", "unsafeGet")

const stateConstructors: Readonly<Record<string, ReadonlyArray<string>>> = {
  Ref: Array.of("unsafeMake"),
  SynchronizedRef: Array.of("unsafeMake"),
  FiberRef: Array.of("unsafeMake")
}

const callIsRuntimeExecution = (context: CheckContext, node: ts.CallExpression): boolean => {
  const directEffect = importedEffectApiAt(context.checker, node.expression, "Effect", runtimeNames)

  const runtimeModule = importedEffectApiAt(
    context.checker,
    node.expression,
    "Runtime",
    runtimeNames
  )

  const managedRuntime = importedEffectApiAt(
    context.checker,
    node.expression,
    "ManagedRuntime",
    runtimeNames
  )

  const managedRuntimeMethod =
    ts.isPropertyAccessExpression(node.expression) &&
    isManagedRuntimeMethodAccess(context.checker, node.expression, runtimeNames)

  const runMain = pipe(
    importedMemberAt(context.checker, node.expression),
    Option.exists((member) => {
      const name = pipe(Array.last(member.path), Option.getOrElse(Function.constant("")))

      const platformRuntime =
        member.moduleSpecifier.startsWith("@effect/platform-node") ||
        member.moduleSpecifier.startsWith("@effect/platform-bun") ||
        member.moduleSpecifier.startsWith("@effect/platform-deno")

      return platformRuntime && name === "runMain"
    })
  )

  return directEffect || runtimeModule || managedRuntime || managedRuntimeMethod || runMain
}

const callIsProvisioning = (context: CheckContext, node: ts.CallExpression): boolean => {
  const effectProvide = importedEffectApiAt(
    context.checker,
    node.expression,
    "Effect",
    provideEffectNames
  )

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
    Array.of("make")
  )

  return effectProvide || layerProvide || managedRuntimeMake
}

const callIsServiceLocator = (context: CheckContext, node: ts.CallExpression): boolean => {
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

  return effectContext || contextLookup
}

const callIsPortLayer = (context: CheckContext, node: ts.CallExpression): boolean =>
  importedEffectApiAt(
    context.checker,
    node.expression,
    "Layer",
    Array.make("effect", "scoped", "succeed")
  )

const callIsEscapingState = (context: CheckContext, node: ts.CallExpression): boolean =>
  Array.some(EffectRecord.toEntries(stateConstructors), ([namespace, names]) =>
    importedEffectApiAt(context.checker, node.expression, namespace, names)
  )

const callExpressionElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.CallExpression): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role) || role.value === "test") {
      return Array.empty()
    }

    const subject = pipe(
      importedMemberAt(context.checker, node.expression),
      Option.map((member) => `${member.moduleSpecifier}:${Array.join(member.path, ".")}`),
      Option.getOrElse(Function.constant(node.expression.getText()))
    )

    const runtime =
      role.value !== "root" && callIsRuntimeExecution(context, node)
        ? Array.of(
            boundaryDetection(context, node.expression, role.value, "runtime-execution", subject)
          )
        : Array.empty<Detection>()

    const provisioning =
      role.value !== "root" && callIsProvisioning(context, node)
        ? Array.of(
            boundaryDetection(
              context,
              node.expression,
              role.value,
              "dependency-provisioning",
              subject
            )
          )
        : Array.empty<Detection>()

    const portLayer =
      role.value === "port" && callIsPortLayer(context, node)
        ? Array.of(
            boundaryDetection(
              context,
              node.expression,
              role.value,
              "port-live-implementation",
              subject
            )
          )
        : Array.empty<Detection>()

    const serviceLocator =
      role.value !== "root" && callIsServiceLocator(context, node)
        ? Array.of(
            boundaryDetection(context, node.expression, role.value, "service-locator", subject)
          )
        : Array.empty<Detection>()

    const ambientCapability = pipe(
      capabilitySubjectAt(context, index.policy, node),
      Option.filter(() => Option.isNone(importedMemberAt(context.checker, node.expression)))
    )

    const directCapability = pipe(
      ambientCapability,
      Option.filter(() => capabilityForbiddenRoles[role.value]),
      Option.map((capability) =>
        boundaryDetection(context, node.expression, role.value, "direct-capability", capability)
      ),
      Option.toArray
    )

    const unsuspended = pipe(
      capabilitySubjectAt(context, index.policy, node),
      Option.filter(() => role.value === "adapter" || role.value === "root"),
      Option.filter(() => !hasSuspensionBoundary(context.checker, node)),
      Option.map((capability) =>
        boundaryDetection(
          context,
          node.expression,
          role.value,
          "unsuspended-adapter-effect",
          capability
        )
      ),
      Option.toArray
    )

    const unscopedResource = pipe(
      resourceSubjectAt(context, index.policy, node),
      Option.filter(() => role.value === "adapter" || role.value === "root"),
      Option.filter(
        () =>
          !hasScopedLifecycleAncestor(context.checker, node) &&
          !sourceFileScopesFunction(context, node)
      ),
      Option.map((resource) =>
        boundaryDetection(context, node.expression, role.value, "unscoped-resource", resource)
      ),
      Option.toArray
    )

    const escapingState =
      callIsEscapingState(context, node) &&
      !hasScopedLifecycleAncestor(context.checker, node) &&
      !sourceFileScopesFunction(context, node)
        ? Array.of(
            boundaryDetection(
              context,
              node.expression,
              role.value,
              "escaping-runtime-state",
              subject
            )
          )
        : Array.empty<Detection>()

    return Array.flatten(
      Array.make(
        runtime,
        provisioning,
        portLayer,
        serviceLocator,
        directCapability,
        unsuspended,
        unscopedResource,
        escapingState
      )
    )
  }

const newExpressionElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.NewExpression): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role) || role.value === "test") {
      return Array.empty()
    }

    const capability = capabilitySubjectAt(context, index.policy, node)

    const directCapability = pipe(
      capability,
      Option.filter(() => capabilityForbiddenRoles[role.value]),
      Option.map((subject) =>
        boundaryDetection(context, node.expression, role.value, "direct-capability", subject)
      ),
      Option.toArray
    )

    const unsuspended = pipe(
      capability,
      Option.filter(() => role.value === "adapter" || role.value === "root"),
      Option.filter(() => !hasSuspensionBoundary(context.checker, node)),
      Option.map((subject) =>
        boundaryDetection(
          context,
          node.expression,
          role.value,
          "unsuspended-adapter-effect",
          subject
        )
      ),
      Option.toArray
    )

    const unscoped = pipe(
      resourceSubjectAt(context, index.policy, node),
      Option.filter(() => role.value === "adapter" || role.value === "root"),
      Option.filter(
        () =>
          !hasScopedLifecycleAncestor(context.checker, node) &&
          !sourceFileScopesFunction(context, node)
      ),
      Option.map((subject) =>
        boundaryDetection(context, node.expression, role.value, "unscoped-resource", subject)
      ),
      Option.toArray
    )

    return Array.flatten(Array.make(directCapability, unsuspended, unscoped))
  }

const propertyAccessElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.PropertyAccessExpression): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role) || role.value === "test") {
      return Array.empty()
    }

    const ambient = ambientCapabilityPropertySubject(context, node)

    const directCapability = pipe(
      ambient,
      Option.filter(() => capabilityForbiddenRoles[role.value]),
      Option.map((subject) =>
        boundaryDetection(context, node, role.value, "direct-capability", subject)
      ),
      Option.toArray
    )

    const unsuspended = pipe(
      ambient,
      Option.filter(() => role.value === "adapter" || role.value === "root"),
      Option.filter(() => !hasSuspensionBoundary(context.checker, node)),
      Option.map((subject) =>
        boundaryDetection(context, node, role.value, "unsuspended-adapter-effect", subject)
      ),
      Option.toArray
    )

    const defaultSelection = pipe(
      Option.liftPredicate((access: ts.PropertyAccessExpression) => access.name.text === "Default")(
        node
      ),
      Option.flatMap((access) => {
        const symbol = context.checker.getSymbolAtLocation(access.expression)

        const resolvedSymbol =
          symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0
            ? context.checker.getAliasedSymbol(symbol)
            : symbol

        const declarations = resolvedSymbol?.declarations ?? Array.empty()

        return Array.findFirst(declarations, ts.isClassDeclaration)
      }),
      Option.filter((declaration) =>
        classExtendsEffectApi(context.checker, declaration, "Effect", "Service")
      ),
      Option.filter(() => role.value !== "root"),
      Option.map(() =>
        boundaryDetection(context, node, role.value, "dependency-provisioning", node.getText())
      ),
      Option.toArray
    )

    return Array.flatten(Array.make(directCapability, unsuspended, defaultSelection))
  }

const classDeclarationElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.ClassDeclaration): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role) || role.value !== "port") {
      return Array.empty()
    }

    const liveService = classExtendsEffectApi(context.checker, node, "Effect", "Service")

    if (!liveService) {
      return Array.empty()
    }

    const target = pipe(Option.fromNullable(node.name), Option.getOrElse(Function.constant(node)))

    const liveImplementation = boundaryDetection(
      context,
      target,
      role.value,
      "port-live-implementation",
      target.getText()
    )

    const embeddedDependencies = pipe(
      effectServiceDependencyProperty(context.checker, node),
      Option.map((property) =>
        boundaryDetection(
          context,
          property.name,
          role.value,
          "port-live-implementation",
          `${target.getText()}.dependencies`
        )
      ),
      Option.toArray
    )

    return Array.prepend(embeddedDependencies, liveImplementation)
  }

const forbiddenContractEffectNamespaces: Readonly<Record<string, true>> = {
  Ref: true,
  SynchronizedRef: true,
  Queue: true,
  PubSub: true,
  SubscriptionRef: true,
  FiberRef: true,
  Runtime: true,
  ManagedRuntime: true
}

const typeReferenceSubject = (
  context: CheckContext,
  policy: FunctionalCoreEffectPolicy,
  node: ts.TypeReferenceNode,
  visited: ReadonlyArray<ts.Symbol> = Array.empty()
): Option.Option<string> => {
  if (typeReferenceIsGlobalPromise(context, node)) {
    return Option.some("Promise")
  }

  const direct = pipe(
    importedTypeMemberAt(context.checker, node.typeName),
    Option.filter((member) => {
      const effectNamespace =
        member.moduleSpecifier === "effect"
          ? (member.path[0] ?? "")
          : member.moduleSpecifier.startsWith("effect/")
            ? member.moduleSpecifier.slice("effect/".length).split("/")[0]
            : ""

      const stateOrRuntime = forbiddenContractEffectNamespaces[effectNamespace] === true

      const capability = moduleMatchesPolicyPrefix(policy, member.moduleSpecifier)

      const typeName = pipe(Array.last(member.path), Option.getOrElse(Function.constant("")))

      const infrastructureSuffix = Array.some(policy.resourceTypeSuffixes, (suffix) =>
        typeName.endsWith(suffix)
      )

      return stateOrRuntime || capability || infrastructureSuffix
    }),
    Option.map((member) => `${member.moduleSpecifier}:${Array.join(member.path, ".")}`)
  )

  if (Option.isSome(direct)) {
    return direct
  }

  const symbol = context.checker.getSymbolAtLocation(node.typeName)

  if (symbol === undefined || Array.some(visited, (candidate) => candidate === symbol)) {
    return Option.none()
  }

  const nextVisited = Array.append(visited, symbol)

  return pipe(
    localTypeReferenceTargets(context.checker, node),
    Array.map((target) => typeReferenceSubject(context, policy, target, nextVisited)),
    Array.findFirst(Option.isSome),
    Option.flatten
  )
}

const typeIsServiceLocator = (
  context: CheckContext,
  node: ts.TypeReferenceNode,
  visited: ReadonlyArray<ts.Symbol> = Array.empty()
): boolean => {
  const direct = pipe(
    importedTypeMemberAt(context.checker, node.typeName),
    Option.exists((member) => {
      const contextType = effectApiMember(member, "Context", Array.of("Context"))

      const runtimeType = effectApiMember(member, "Runtime", Array.of("Runtime"))

      const managedRuntimeType = effectApiMember(
        member,
        "ManagedRuntime",
        Array.of("ManagedRuntime")
      )

      return contextType || runtimeType || managedRuntimeType
    })
  )

  if (direct) {
    return true
  }

  const unresolvedSymbol = context.checker.getSymbolAtLocation(node.typeName)

  if (unresolvedSymbol === undefined) {
    return false
  }

  const symbol =
    (unresolvedSymbol.flags & ts.SymbolFlags.Alias) !== 0
      ? context.checker.getAliasedSymbol(unresolvedSymbol)
      : unresolvedSymbol

  if (Array.some(visited, (candidate) => candidate === symbol)) {
    return false
  }

  const nextVisited = Array.append(visited, symbol)

  return Array.some(localTypeReferenceTargets(context.checker, node), (target) =>
    typeIsServiceLocator(context, target, nextVisited)
  )
}

const typeReferenceElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.TypeReferenceNode): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role) || role.value === "test" || role.value === "root") {
      return Array.empty()
    }

    const serviceLocator = typeIsServiceLocator(context, node)
      ? Array.of(
          boundaryDetection(
            context,
            node.typeName,
            role.value,
            "service-locator",
            node.typeName.getText()
          )
        )
      : Array.empty<Detection>()

    const infrastructureContract =
      role.value === "port" && isTopLevelExportedDeclaration(node)
        ? pipe(
            typeReferenceSubject(context, index.policy, node),
            Option.map((subject) =>
              boundaryDetection(
                context,
                node.typeName,
                role.value,
                "infrastructure-contract",
                subject
              )
            ),
            Option.toArray
          )
        : Array.empty<Detection>()

    const domainPromise =
      role.value === "domain" && typeReferenceIsGlobalPromise(context, node)
        ? Array.of(
            boundaryDetection(
              context,
              node.typeName,
              role.value,
              "domain-effect-program",
              "Promise"
            )
          )
        : Array.empty<Detection>()

    return Array.flatten(Array.make(serviceLocator, infrastructureContract, domainPromise))
  }

const asyncKeywordElements =
  (index: FunctionalCoreEffectIndex) =>
  (context: CheckContext) =>
  (node: ts.Node): ReadonlyArray<Detection> => {
    const role = roleForSourceFile(index, context.sourceFile)

    if (Option.isNone(role) || role.value !== "domain") {
      return Array.empty()
    }

    return Array.of(
      boundaryDetection(context, node, role.value, "domain-effect-program", "Promise")
    )
  }

const isAsyncKeyword = (node: ts.Node): node is ts.Node => node.kind === ts.SyntaxKind.AsyncKeyword

const exportKinds = Array.of(ts.SyntaxKind.ExportDeclaration)
const asyncKeywordKinds = Array.of(ts.SyntaxKind.AsyncKeyword)
const importKinds = Array.of(ts.SyntaxKind.ImportDeclaration)
const callKinds = Array.of(ts.SyntaxKind.CallExpression)
const newKinds = Array.of(ts.SyntaxKind.NewExpression)
const propertyKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)
const classKinds = Array.of(ts.SyntaxKind.ClassDeclaration)
const typeReferenceKinds = Array.of(ts.SyntaxKind.TypeReference)

const subscriptionsFor = (index: FunctionalCoreEffectIndex): ReadonlyArray<Subscription> =>
  Array.flatten(
    Array.make(
      nodeSubscriptions(importKinds)(ts.isImportDeclaration)(architectureImportElements(index)),
      nodeSubscriptions(exportKinds)(ts.isExportDeclaration)(architectureExportElements(index)),
      nodeSubscriptions(callKinds)(ts.isCallExpression)(callExpressionElements(index)),
      nodeSubscriptions(newKinds)(ts.isNewExpression)(newExpressionElements(index)),
      nodeSubscriptions(propertyKinds)(ts.isPropertyAccessExpression)(
        propertyAccessElements(index)
      ),
      nodeSubscriptions(classKinds)(ts.isClassDeclaration)(classDeclarationElements(index)),
      nodeSubscriptions(typeReferenceKinds)(ts.isTypeReferenceNode)(typeReferenceElements(index)),
      nodeSubscriptions(asyncKeywordKinds)(isAsyncKeyword)(asyncKeywordElements(index))
    )
  )

export const makeFunctionalCoreEffect = (policy: FunctionalCoreEffectPolicy): Check =>
  withProgramIndex(buildFunctionalCoreEffectIndex(policy))(subscriptionsFor)
