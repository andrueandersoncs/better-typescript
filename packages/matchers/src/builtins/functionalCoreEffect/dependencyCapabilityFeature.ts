import {
  Array,
  Function,
  HashSet,
  Match,
  Match as EffectMatch,
  Option,
  Struct,
  flow,
  pipe
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { Match as FactMatch } from "../../matcher/match.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { Subscription } from "../../matcher/subscription.js"
import { nodeSubscriptions } from "../../matcher/nodeSubscriptions.js"
import { FunctionalCoreBoundaryData } from "./boundaryData.js"
import type { FunctionalCoreShapeData } from "./shapeData.js"
import { boundaryDetection } from "./boundaryDetection.js"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"
import { roleForSourceFile } from "./roleForSourceFile.js"
import { capabilityForbiddenRoles } from "./capabilityForbiddenRoles.js"
import { moduleMatchesPolicyPrefix } from "./moduleMatchesPolicyPrefix.js"
import { moduleSpecifierText } from "./moduleSpecifierText.js"
import { importedMemberAt } from "./importedMemberAt.js"
import { importedMemberSubject } from "./importedMemberSubject.js"
import { importedMemberIsMovedPlatformCapability } from "./movedPlatformCapabilities.js"
import { emptyDetections } from "./emptyDetections.js"
import { foldAst } from "../../sources/foldAst.js"
import { nodeOwnsChild } from "../../support/nodeOwnsChild.js"
import { noneString } from "../../support/noneString.js"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"
import type { ImportedMember } from "./importedMember.js"
import { importedTypeMemberAt } from "./importedTypeMemberAt.js"

const makeDependencyCapabilityFeature = () => {
  const allowedTargetRoles = (role: ArchitectureRole): ReadonlyArray<ArchitectureRole> =>
    pipe(
      EffectMatch.value(role),
      EffectMatch.when("domain", (): ReadonlyArray<ArchitectureRole> =>
        Array.of<ArchitectureRole>("domain")
      ),
      EffectMatch.when("port", (): ReadonlyArray<ArchitectureRole> =>
        Array.make<[ArchitectureRole, ArchitectureRole]>("domain", "port")
      ),
      EffectMatch.when("application", (): ReadonlyArray<ArchitectureRole> =>
        Array.make<[ArchitectureRole, ArchitectureRole, ArchitectureRole]>(
          "domain",
          "port",
          "application"
        )
      ),
      EffectMatch.when("adapter", (): ReadonlyArray<ArchitectureRole> =>
        Array.make<[ArchitectureRole, ArchitectureRole, ArchitectureRole, ArchitectureRole]>(
          "domain",
          "port",
          "application",
          "adapter"
        )
      ),
      EffectMatch.when("root", (): ReadonlyArray<ArchitectureRole> =>
        Array.make<
          [
            ArchitectureRole,
            ArchitectureRole,
            ArchitectureRole,
            ArchitectureRole,
            ArchitectureRole,
            ArchitectureRole
          ]
        >("domain", "port", "application", "adapter", "root", "test")
      ),
      EffectMatch.when("test", (): ReadonlyArray<ArchitectureRole> =>
        Array.make<
          [
            ArchitectureRole,
            ArchitectureRole,
            ArchitectureRole,
            ArchitectureRole,
            ArchitectureRole,
            ArchitectureRole
          ]
        >("domain", "port", "application", "adapter", "root", "test")
      ),
      EffectMatch.exhaustive
    )

  const canImportRole = (importer: ArchitectureRole, imported: ArchitectureRole) => {
    const allowed = allowedTargetRoles(importer)

    return Array.contains(allowed, imported)
  }

  const emptyPath: ReadonlyArray<string> = Array.empty()
  const emptyIdentifiers: ReadonlyArray<ts.Identifier> = Array.empty()

  const forbiddenDomainNamespaces = HashSet.make(
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
    "Latch",
    "Semaphore"
  )

  const namespaceIsForbidden = (namespace: string) =>
    HashSet.has(forbiddenDomainNamespaces, namespace)

  const isForbiddenDomainMember = (moduleSpecifier: string, path: ReadonlyArray<string>) => {
    if (moduleSpecifier.startsWith("effect/")) {
      const effectPath = moduleSpecifier.slice("effect/".length)
      const segments = effectPath.split("/")
      const namespace = Array.get(segments, 0)

      return pipe(namespace, Option.exists(namespaceIsForbidden))
    }

    const isEffectModule = strictEqual("effect")(moduleSpecifier)
    const pathHead = Array.get(path, 0)

    const namespaceForbidden = pipe(
      pathHead,
      Option.match({
        onNone: Function.constTrue,
        onSome: namespaceIsForbidden
      })
    )

    return isEffectModule && namespaceForbidden
  }

  const memberIsForbiddenDomain = (member: ImportedMember) =>
    isForbiddenDomainMember(member.moduleSpecifier, member.path)

  const exportBindingIdentifiers = (
    declaration: ts.ExportDeclaration
  ): ReadonlyArray<ts.Identifier> =>
    pipe(
      Option.fromNullishOr(declaration.exportClause),
      Option.match({
        onNone: Function.constant(emptyIdentifiers),
        onSome: (exportClause) => {
          const names = ts.isNamespaceExport(exportClause)
            ? Array.of(exportClause.name)
            : Array.map(exportClause.elements, Struct.get("name"))

          return Array.filter(names, ts.isIdentifier)
        }
      })
    )

  const importBindingIdentifiers = (
    declaration: ts.ImportDeclaration
  ): ReadonlyArray<ts.Identifier> =>
    pipe(
      Option.fromNullishOr(declaration.importClause),
      Option.match({
        onNone: Function.constant(emptyIdentifiers),
        onSome: (importClause) => {
          const defaultBinding = pipe(Option.fromNullishOr(importClause.name), Option.toArray)

          return pipe(
            Option.fromNullishOr(importClause.namedBindings),
            Option.match({
              onNone: Function.constant(defaultBinding),
              onSome: (namedBindings) => {
                const named = ts.isNamespaceImport(namedBindings)
                  ? Array.of(namedBindings.name)
                  : Array.map(namedBindings.elements, Struct.get("name"))

                return Array.appendAll(defaultBinding, named)
              }
            })
          )
        }
      })
    )

  const noneIdentifier: Option.Option<ts.Identifier> = Option.none()
  const constantNoneIdentifier = Function.constant(noneIdentifier)
  const constantNoneString = Function.constant(noneString)

  const rootIdentifierFromAccess = (access: ts.PropertyAccessExpression) =>
    propertyAccessRootIdentifier(access.expression)

  const propertyAccessRootIdentifier = (expression: ts.Expression): Option.Option<ts.Identifier> =>
    pipe(
      Match.value(expression),
      Match.when(ts.isIdentifier, Option.some<ts.Identifier>),
      Match.when(ts.isPropertyAccessExpression, rootIdentifierFromAccess),
      Match.orElse(constantNoneIdentifier)
    )

  const qualifiedNameRootIdentifier = (name: ts.EntityName): ts.Identifier =>
    ts.isIdentifier(name) ? name : qualifiedNameRootIdentifier(name.left)

  const propertyAccessForbiddenSubject = (
    context: MatchContext,
    current: ts.PropertyAccessExpression,
    referencesBinding: (candidate: ts.Identifier) => boolean
  ) =>
    pipe(
      propertyAccessRootIdentifier(current.expression),
      Option.filter(referencesBinding),
      Option.flatMap(() => importedMemberAt(context.checker, current)),
      Option.filter(memberIsForbiddenDomain),
      Option.map(Struct.get("moduleSpecifier"))
    )

  const qualifiedNameForbiddenSubject = (
    context: MatchContext,
    current: ts.QualifiedName,
    referencesBinding: (candidate: ts.Identifier) => boolean
  ): Option.Option<string> => {
    const root = qualifiedNameRootIdentifier(current)

    if (!referencesBinding(root)) {
      return Option.none()
    }

    return pipe(
      importedTypeMemberAt(context.checker, current),
      Option.filter(memberIsForbiddenDomain),
      Option.map(Struct.get("moduleSpecifier"))
    )
  }

  const bareBindingForbiddenSubject = (binding: Option.Option<ImportedMember>) =>
    pipe(binding, Option.filter(memberIsForbiddenDomain), Option.map(Struct.get("moduleSpecifier")))

  const propertyAccessExpression = Struct.get<ts.PropertyAccessExpression, "expression">(
    "expression"
  )

  const qualifiedNameLeft = Struct.get<ts.QualifiedName, "left">("left")

  const identifierIsPropertyAccessRoot = nodeOwnsChild(
    ts.isPropertyAccessExpression,
    propertyAccessExpression
  )

  const identifierIsQualifiedNameRoot = nodeOwnsChild(ts.isQualifiedName, qualifiedNameLeft)

  const namespaceBindingSubject = (context: MatchContext, identifier: ts.Identifier) => {
    const symbolAtIdentifier = context.checker.getSymbolAtLocation(identifier)
    const bindingSymbolOption = Option.fromNullishOr(symbolAtIdentifier)
    const binding = importedMemberAt(context.checker, identifier)

    return pipe(
      Option.all({ bindingSymbol: bindingSymbolOption, binding }),
      Option.flatMap(({ bindingSymbol }) => {
        const referencesBinding = flow(
          (candidate: ts.Identifier) => context.checker.getSymbolAtLocation(candidate),
          strictEqual(bindingSymbol)
        )

        const subjectFromIdentifier = (current: ts.Identifier): Option.Option<string> => {
          const isSelf = strictEqual(identifier)(current)
          const bound = referencesBinding(current)
          const unbound = strictEqual(false)(bound)
          const skipChecks = Array.make(isSelf, unbound)

          if (Array.some(skipChecks, Boolean)) {
            return Option.none()
          }

          const isPropertyRoot = identifierIsPropertyAccessRoot(current.parent, current)
          const isQualifiedRoot = identifierIsQualifiedNameRoot(current.parent, current)
          const memberAccessRoots = Array.make(isPropertyRoot, isQualifiedRoot)
          const isMemberAccessRoot = Array.some(memberAccessRoots, Boolean)

          return isMemberAccessRoot ? Option.none() : bareBindingForbiddenSubject(binding)
        }

        const propertyAccessForbiddenSubjectOf = (access: ts.PropertyAccessExpression) =>
          propertyAccessForbiddenSubject(context, access, referencesBinding)

        const qualifiedNameForbiddenSubjectOf = (qualified: ts.QualifiedName) =>
          qualifiedNameForbiddenSubject(context, qualified, referencesBinding)

        const reduceForbiddenSubject = (subject: Option.Option<string>, current: ts.Node) => {
          if (Option.isSome(subject)) {
            return subject
          }

          return pipe(
            Match.value(current),
            Match.when(ts.isPropertyAccessExpression, propertyAccessForbiddenSubjectOf),
            Match.when(ts.isQualifiedName, qualifiedNameForbiddenSubjectOf),
            Match.when(ts.isIdentifier, subjectFromIdentifier),
            Match.orElse(constantNoneString)
          )
        }

        const fold = foldAst(reduceForbiddenSubject)

        return fold(context.sourceFile)(noneString)
      })
    )
  }

  const forbiddenDomainMemberAt = (
    context: MatchContext,
    identifier: ts.Identifier,
    inspectNamespaceUsage: boolean
  ) =>
    pipe(
      importedMemberAt(context.checker, identifier),
      Option.flatMap((member) => {
        const isNamespaceBinding = strictEqual(0)(member.path.length)
        const inspectFlags = Array.make(inspectNamespaceUsage, isNamespaceBinding)
        const shouldInspectNamespace = Array.every(inspectFlags, Boolean)

        if (shouldInspectNamespace) {
          return namespaceBindingSubject(context, identifier)
        }

        return pipe(
          Option.some(member),
          Option.filter(memberIsForbiddenDomain),
          Option.map(Struct.get("moduleSpecifier"))
        )
      })
    )

  const firstForbiddenDomainMember = (
    context: MatchContext,
    identifiers: ReadonlyArray<ts.Identifier>,
    inspectNamespaceUsage: boolean
  ) => {
    const forbiddenDomainMemberAtOf = (identifier: ts.Identifier) =>
      forbiddenDomainMemberAt(context, identifier, inspectNamespaceUsage)

    return pipe(
      identifiers,
      Array.map(forbiddenDomainMemberAtOf),
      Array.findFirst(Option.isSome),
      Option.flatten
    )
  }

  const resolvedModuleSourceFile = (
    context: MatchContext,
    declaration: ts.ImportDeclaration | ts.ExportDeclaration
  ) => {
    const findFirstOf = (declarations: ReadonlyArray<ts.Declaration>) =>
      Array.findFirst(declarations, ts.isSourceFile)

    const pipeOf4 = (specifier: ts.Node) =>
      pipe(
        context.checker.getSymbolAtLocation(specifier),
        Option.fromNullishOr,
        Option.map(declarationsOfSymbol),
        Option.flatMap(findFirstOf)
      )

    const checkerSource = pipe(
      Option.fromNullishOr(declaration.moduleSpecifier),
      Option.flatMap(pipeOf4)
    )

    if (Option.isSome(checkerSource)) {
      return checkerSource
    }

    const specifier = pipe(
      Option.fromNullishOr(declaration.moduleSpecifier),
      Option.filter(ts.isStringLiteralLike),
      Option.map(Struct.get("text"))
    )

    const pipeOf5 = (resolved: ts.ResolvedModuleFull) =>
      pipe(context.program.getSourceFile(resolved.resolvedFileName), Option.fromNullishOr)

    return pipe(
      specifier,
      Option.flatMap((text) => {
        const compilerOptions = context.program.getCompilerOptions()

        const resolution = ts.resolveModuleName(
          text,
          context.sourceFile.fileName,
          compilerOptions,
          ts.sys
        )

        return Option.fromNullishOr(resolution.resolvedModule)
      }),
      Option.flatMap(pipeOf5)
    )
  }

  const namedImportsHaveRuntimeValue = (bindings: ts.NamedImports) =>
    Array.some(bindings.elements, (specifier) => !specifier.isTypeOnly)

  const importHasRuntimeValue = (declaration: ts.ImportDeclaration) =>
    pipe(
      Option.fromNullishOr(declaration.importClause),
      Option.match({
        onNone: Function.constTrue,
        onSome: (clause) => {
          const isValueImport = !clause.isTypeOnly
          const defaultName = Option.fromNullishOr(clause.name)
          const hasDefaultName = Option.isSome(defaultName)

          const hasNamedRuntime = pipe(
            Option.fromNullishOr(clause.namedBindings),
            Option.match({
              onNone: Function.constTrue,
              onSome: (bindings) =>
                pipe(
                  EffectMatch.value(bindings),
                  EffectMatch.when(ts.isNamespaceImport, Function.constTrue),
                  EffectMatch.when(ts.isNamedImports, namedImportsHaveRuntimeValue),
                  EffectMatch.exhaustive
                )
            })
          )

          const hasRuntimeBinding = hasDefaultName || hasNamedRuntime
          const matchFlags = Array.make(isValueImport, hasRuntimeBinding)

          return Array.every(matchFlags, Boolean)
        }
      })
    )

  const forbiddenDomainImport = (context: MatchContext, declaration: ts.ImportDeclaration) => {
    const identifiers = importBindingIdentifiers(declaration)
    return firstForbiddenDomainMember(context, identifiers, true)
  }

  const architectureImportElements = (index: FunctionalCoreEffectIndex) => {
    const roleForResolvedSourceFile = (sourceFile: ts.SourceFile) =>
      roleForSourceFile(index, sourceFile)

    const subjectMatchesPolicyPrefix = (subject: string) =>
      moduleMatchesPolicyPrefix(index.policy, subject)

    const elementsForContext = (context: MatchContext) => {
      const elementsForNode = (
        node: ts.ImportDeclaration
      ): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
        const role = roleForSourceFile(index, context.sourceFile)

        if (Option.isNone(role)) {
          return emptyDetections
        }

        const targetRole = pipe(
          resolvedModuleSourceFile(context, node),
          Option.flatMap(roleForResolvedSourceFile)
        )

        const cannotImportRole = (target: ArchitectureRole) => !canImportRole(role.value, target)

        const directionDetection = pipe(
          targetRole,
          Option.filter(cannotImportRole),
          Option.map((target) => {
            const subject = `${role.value} -> ${target}`
            const targetOption = Option.some(target)

            return boundaryDetection(
              context,
              node.moduleSpecifier,
              role.value,
              "dependency-direction",
              subject,
              targetOption
            )
          }),
          Option.toArray
        )

        const domainEffectProgramDetection = (subject: string) =>
          boundaryDetection(
            context,
            node.moduleSpecifier,
            role.value,
            "domain-effect-program",
            subject
          )

        const domainDetection = strictEqual("domain")(role.value)
          ? pipe(
              forbiddenDomainImport(context, node),
              Option.map(domainEffectProgramDetection),
              Option.toArray
            )
          : emptyDetections

        const importProvidesRuntime = importHasRuntimeValue(node)
        const roleForbidsCapability = capabilityForbiddenRoles[role.value]

        const moduleCapability = pipe(
          moduleSpecifierText(node),
          Option.filter(Function.constant(importProvidesRuntime)),
          Option.filter(subjectMatchesPolicyPrefix)
        )

        const pipeOf = (identifier: ts.Identifier) =>
          pipe(
            importedMemberAt(context.checker, identifier),
            Option.filter(importedMemberIsMovedPlatformCapability),
            Option.map(importedMemberSubject)
          )

        const barrelCapability = importProvidesRuntime
          ? pipe(
              importBindingIdentifiers(node),
              Array.map(pipeOf),
              Array.findFirst(Option.isSome),
              Option.flatten
            )
          : Option.none()

        const directCapabilityDetection = (subject: string) =>
          boundaryDetection(context, node.moduleSpecifier, role.value, "direct-capability", subject)

        const capabilityDetection = pipe(
          moduleCapability,
          Option.orElse(Function.constant(barrelCapability)),
          Option.filter(Function.constant(roleForbidsCapability)),
          Option.map(directCapabilityDetection),
          Option.toArray
        )

        const domainAndCapability = Array.appendAll(domainDetection, capabilityDetection)
        return Array.appendAll(directionDetection, domainAndCapability)
      }

      return elementsForNode
    }

    return elementsForContext
  }

  const moduleSpecifierIsForbiddenDomain = (moduleSpecifier: string) =>
    isForbiddenDomainMember(moduleSpecifier, emptyPath)

  const forbiddenDomainExport = (context: MatchContext, declaration: ts.ExportDeclaration) => {
    const exportClauseOption = Option.fromNullishOr(declaration.exportClause)

    if (Option.isNone(exportClauseOption)) {
      return pipe(moduleSpecifierText(declaration), Option.filter(moduleSpecifierIsForbiddenDomain))
    }

    const identifiers = exportBindingIdentifiers(declaration)
    return firstForbiddenDomainMember(context, identifiers, false)
  }

  const exportElementIsValue = flow(
    Struct.get<ts.ExportSpecifier, "isTypeOnly">("isTypeOnly"),
    strictEqual(false)
  )

  const namedExportsHaveValue = (named: ts.NamedExports) =>
    Array.some(named.elements, exportElementIsValue)

  const exportClauseAllowsRuntime = (exportClause: ts.NamedExportBindings) =>
    pipe(
      EffectMatch.value(exportClause),
      EffectMatch.when(ts.isNamespaceExport, Function.constTrue),
      EffectMatch.when(ts.isNamedExports, namedExportsHaveValue),
      EffectMatch.exhaustive
    )

  const exportHasRuntimeValue = (declaration: ts.ExportDeclaration) => {
    const isValueExport = strictEqual(false)(declaration.isTypeOnly)
    const exportClauseOption = Option.fromNullishOr(declaration.exportClause)

    const clauseAllowsRuntime = Option.match(exportClauseOption, {
      onNone: Function.constTrue,
      onSome: exportClauseAllowsRuntime
    })

    const runtimeChecks = Array.make(isValueExport, clauseAllowsRuntime)
    return Array.every(runtimeChecks, Boolean)
  }

  const architectureExportElements = (index: FunctionalCoreEffectIndex) => {
    const roleForResolvedSourceFile2 = (sourceFile: ts.SourceFile) =>
      roleForSourceFile(index, sourceFile)

    const subjectMatchesPolicyPrefix2 = (subject: string) =>
      moduleMatchesPolicyPrefix(index.policy, subject)

    const elementsForContext = (context: MatchContext) => {
      const elementsForNode = (
        node: ts.ExportDeclaration
      ): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> => {
        const role = roleForSourceFile(index, context.sourceFile)
        const moduleSpecifierOption = Option.fromNullishOr(node.moduleSpecifier)
        const exportInputs = Option.all({ role, moduleSpecifier: moduleSpecifierOption })

        if (Option.isNone(exportInputs)) {
          return emptyDetections
        }

        const targetRole = pipe(
          resolvedModuleSourceFile(context, node),
          Option.flatMap(roleForResolvedSourceFile2)
        )

        const cannotImportRole2 = (target: ArchitectureRole) =>
          !canImportRole(exportInputs.value.role, target)

        const directionDetection = pipe(
          targetRole,
          Option.filter(cannotImportRole2),
          Option.map((target) => {
            const subject = `${exportInputs.value.role} -> ${target}`
            const targetOption = Option.some(target)

            return boundaryDetection(
              context,
              exportInputs.value.moduleSpecifier,
              exportInputs.value.role,
              "dependency-direction",
              subject,
              targetOption
            )
          }),
          Option.toArray
        )

        const domainEffectProgramDetection2 = (subject: string) =>
          boundaryDetection(
            context,
            exportInputs.value.moduleSpecifier,
            exportInputs.value.role,
            "domain-effect-program",
            subject
          )

        const domainDetection = strictEqual("domain")(exportInputs.value.role)
          ? pipe(
              forbiddenDomainExport(context, node),
              Option.map(domainEffectProgramDetection2),
              Option.toArray
            )
          : emptyDetections

        const exportProvidesRuntime = exportHasRuntimeValue(node)
        const roleForbidsCapability = capabilityForbiddenRoles[exportInputs.value.role]

        const moduleCapability = pipe(
          moduleSpecifierText(node),
          Option.filter(Function.constant(exportProvidesRuntime)),
          Option.filter(subjectMatchesPolicyPrefix2)
        )

        const pipeOf2 = (identifier: ts.Identifier) =>
          pipe(
            importedMemberAt(context.checker, identifier),
            Option.filter(importedMemberIsMovedPlatformCapability),
            Option.map(importedMemberSubject)
          )

        const barrelCapability = exportProvidesRuntime
          ? pipe(
              exportBindingIdentifiers(node),
              Array.map(pipeOf2),
              Array.findFirst(Option.isSome),
              Option.flatten
            )
          : Option.none()

        const directCapabilityDetection2 = (subject: string) =>
          boundaryDetection(
            context,
            exportInputs.value.moduleSpecifier,
            exportInputs.value.role,
            "direct-capability",
            subject
          )

        const capabilityDetection = pipe(
          moduleCapability,
          Option.orElse(Function.constant(barrelCapability)),
          Option.filter(Function.constant(roleForbidsCapability)),
          Option.map(directCapabilityDetection2),
          Option.toArray
        )

        const domainAndCapability = Array.appendAll(domainDetection, capabilityDetection)
        return Array.appendAll(directionDetection, domainAndCapability)
      }

      return elementsForNode
    }

    return elementsForContext
  }

  const importKinds = Array.of(ts.SyntaxKind.ImportDeclaration)
  const exportKinds = Array.of(ts.SyntaxKind.ExportDeclaration)

  const dependencyCapabilityBoundaryFacts = (
    index: FunctionalCoreEffectIndex
  ): ReadonlyArray<Subscription<FunctionalCoreBoundaryData>> => {
    const importElements = architectureImportElements(index)
    const exportElements = architectureExportElements(index)

    const importSubscriptions = nodeSubscriptions(importKinds)(ts.isImportDeclaration)(
      importElements
    )

    const exportSubscriptions = nodeSubscriptions(exportKinds)(ts.isExportDeclaration)(
      exportElements
    )

    return Array.appendAll(importSubscriptions, exportSubscriptions)
  }

  const emptyShapeFacts = (
    _index: FunctionalCoreEffectIndex
  ): ReadonlyArray<Subscription<FunctionalCoreShapeData>> => Array.empty()

  class Feature {
    constructor(
      readonly boundaryFacts: typeof dependencyCapabilityBoundaryFacts,
      readonly shapeFacts: typeof emptyShapeFacts
    ) {}
  }

  return new Feature(dependencyCapabilityBoundaryFacts, emptyShapeFacts)
}

export const dependencyCapabilityFeature = makeDependencyCapabilityFeature()
