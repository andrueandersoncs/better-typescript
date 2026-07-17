import {
  Array,
  Data,
  Function,
  HashSet,
  Match,
  Option,
  Predicate,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { FunctionalCoreEffectPolicy } from "./policy.js"
import {
  hasExportModifier,
  isProjectFile,
  unwrapCallee,
  unwrapTransparentExpression
} from "../support/tsNode.js"

// ImportedMember is shared specifier and member-path pair because helpers exchange one binding.
export class ImportedMember extends Data.Class<{
  readonly moduleSpecifier: string
  readonly path: ReadonlyArray<string>
}> {}

const emptyMemberPath: ReadonlyArray<string> = Array.empty()

const emptyTypeReferences: ReadonlyArray<ts.TypeReferenceNode> = Array.empty()

const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()

const emptyHeritageClauses: ReadonlyArray<ts.HeritageClause> = Array.empty()

const moduleDeclarationAncestor = (
  node: ts.Node
): Option.Option<ts.ImportDeclaration | ts.ExportDeclaration> => {
  const isModuleDeclaration = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)

  return isModuleDeclaration
    ? Option.some(node)
    : pipe(Option.fromNullishOr(node.parent), Option.flatMap(moduleDeclarationAncestor))
}

export const moduleSpecifierText = (declaration: ts.ImportDeclaration | ts.ExportDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.moduleSpecifier),
    Option.filter(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

const expressionPath = (
  expression: ts.Expression
): Option.Option<readonly [ts.Identifier, ReadonlyArray<string>]> =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(
      ts.isIdentifier,
      flow((identifier: ts.Identifier) => Tuple.make(identifier, emptyMemberPath), Option.some)
    ),
    Match.when(ts.isPropertyAccessExpression, (access) => {
      const memberName = access.name.text

      return pipe(
        expressionPath(access.expression),
        Option.map((path) => {
          const members = Array.append(path[1], memberName)

          return Tuple.make(path[0], members)
        })
      )
    }),
    Match.when(ts.isElementAccessExpression, (access) => {
      const member = pipe(
        Option.fromNullishOr(access.argumentExpression),
        Option.filter(ts.isStringLiteralLike),
        Option.map(Struct.get("text"))
      )

      const base = expressionPath(access.expression)

      return pipe(
        Option.all({ base, member }),
        Option.map(({ base, member }) => {
          const members = Array.append(base[1], member)

          return Tuple.make(base[0], members)
        })
      )
    }),
    Match.orElse(() => Option.none())
  )

const entityNamePath = (name: ts.EntityName): readonly [ts.Identifier, ReadonlyArray<string>] =>
  pipe(
    Match.value(name),
    Match.when(ts.isIdentifier, (identifier) => Tuple.make(identifier, emptyMemberPath)),
    Match.orElse((qualifiedName) => {
      const parent = entityNamePath(qualifiedName.left)
      const members = Array.append(parent[1], qualifiedName.right.text)

      return Tuple.make(parent[0], members)
    })
  )

const bindingFromNamedSpecifier = (
  moduleSpecifier: string,
  declaration: ts.ImportSpecifier | ts.ExportSpecifier
) => {
  const importedName = declaration.propertyName?.text ?? declaration.name.text
  const path = Array.of(importedName)

  return new ImportedMember({
    moduleSpecifier,
    path
  })
}

const bindingFromNamespace = (moduleSpecifier: string) =>
  new ImportedMember({
    moduleSpecifier,
    path: emptyMemberPath
  })

const bindingFromDefaultImport = (moduleSpecifier: string) => {
  const path = Array.of("default")

  return new ImportedMember({
    moduleSpecifier,
    path
  })
}

const bindingFromDeclaration = (declaration: ts.Declaration) => {
  const moduleDeclaration = moduleDeclarationAncestor(declaration)
  const moduleSpecifier = pipe(moduleDeclaration, Option.flatMap(moduleSpecifierText))

  return pipe(
    moduleSpecifier,
    Option.flatMap((specifier) =>
      pipe(
        Match.value(declaration),
        Match.when(
          ts.isImportSpecifier,
          flow(
            (importSpecifier: ts.ImportSpecifier) =>
              bindingFromNamedSpecifier(specifier, importSpecifier),
            Option.some
          )
        ),
        Match.when(
          ts.isExportSpecifier,
          flow(
            (exportSpecifier: ts.ExportSpecifier) =>
              bindingFromNamedSpecifier(specifier, exportSpecifier),
            Option.some
          )
        ),
        Match.when(
          ts.isNamespaceImport,
          flow(Function.constant(specifier), bindingFromNamespace, Option.some)
        ),
        Match.when(
          ts.isNamespaceExport,
          flow(Function.constant(specifier), bindingFromNamespace, Option.some)
        ),
        Match.when(ts.isImportClause, (importClause) =>
          pipe(
            Option.fromNullishOr(importClause.name),
            Option.map(() => bindingFromDefaultImport(specifier))
          )
        ),
        Match.orElse(() => Option.none())
      )
    )
  )
}

const maximumBarrelDepth = 8

const declarationHasBinding = flow(bindingFromDeclaration, Option.isSome)

const resolvedBarrelBinding = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
  binding: ImportedMember,
  depth: number
): ImportedMember => {
  const depthExhausted = depth === 0
  const pathExhausted = binding.path.length === 0
  const exhausted = depthExhausted || pathExhausted

  if (exhausted) {
    return binding
  }

  const moduleSymbol = pipe(
    moduleDeclarationAncestor(declaration),
    Option.flatMap((moduleDeclaration) =>
      pipe(
        Option.fromNullishOr(moduleDeclaration.moduleSpecifier),
        Option.flatMap(
          flow(
            (moduleSpecifier) => checker.getSymbolAtLocation(moduleSpecifier),
            Option.fromNullishOr
          )
        )
      )
    )
  )

  const firstPartyModule = pipe(
    moduleSymbol,
    Option.exists((symbol) =>
      Array.some(
        symbol.declarations ?? emptyDeclarations,
        flow((candidate) => candidate.getSourceFile(), isProjectFile)
      )
    )
  )

  const missingModule = Option.isNone(moduleSymbol)
  const externalModule = !firstPartyModule
  const keepBinding = externalModule || missingModule

  if (keepBinding) {
    return binding
  }

  const importedName = pipe(Array.head(binding.path), Option.getOrElse(Function.constant("")))

  const next = pipe(
    checker.getExportsOfModule(moduleSymbol.value),
    Array.findFirst((symbol) => symbol.name === importedName),
    Option.flatMap((symbol) =>
      pipe(symbol.declarations ?? emptyDeclarations, Array.findFirst(declarationHasBinding))
    ),
    Option.flatMap((candidate) =>
      pipe(
        bindingFromDeclaration(candidate),
        Option.map((candidateBinding) => Tuple.make(candidate, candidateBinding))
      )
    )
  )

  if (Option.isNone(next)) {
    return binding
  }

  const [nextDeclaration, nextBinding] = next.value
  const remainingPath = Array.drop(binding.path, 1)
  const path = Array.appendAll(nextBinding.path, remainingPath)

  const completeNextBinding = new ImportedMember({
    moduleSpecifier: nextBinding.moduleSpecifier,
    path
  })

  return resolvedBarrelBinding(checker, nextDeclaration, completeNextBinding, depth - 1)
}

const importBindingAt = (
  checker: ts.TypeChecker,
  identifier: ts.Identifier,
  members: ReadonlyArray<string>
) =>
  pipe(
    checker.getSymbolAtLocation(identifier),
    Option.fromNullishOr,
    Option.map((symbol) => symbol.declarations ?? emptyDeclarations),
    Option.flatMap(Array.findFirst(declarationHasBinding)),
    Option.flatMap((declaration) =>
      pipe(
        bindingFromDeclaration(declaration),
        Option.map((binding) => {
          const path = Array.appendAll(binding.path, members)

          const completeBinding = new ImportedMember({
            moduleSpecifier: binding.moduleSpecifier,
            path
          })

          return resolvedBarrelBinding(checker, declaration, completeBinding, maximumBarrelDepth)
        })
      )
    )
  )

const importedMemberFromPath = (
  checker: ts.TypeChecker,
  path: readonly [ts.Identifier, ReadonlyArray<string>]
) => {
  const root = path[0]
  const members = path[1]

  return importBindingAt(checker, root, members)
}

export const importedMemberAt = (checker: ts.TypeChecker, expression: ts.Expression) =>
  pipe(
    expressionPath(expression),
    Option.flatMap((path) => importedMemberFromPath(checker, path))
  )

export const importedTypeMemberAt = (checker: ts.TypeChecker, name: ts.EntityName) => {
  const path = entityNamePath(name)

  return importedMemberFromPath(checker, path)
}

const appendTypeReference = (
  references: ReadonlyArray<ts.TypeReferenceNode>,
  current: ts.Node
): ReadonlyArray<ts.TypeReferenceNode> =>
  ts.isTypeReferenceNode(current) ? Array.append(references, current) : references

const typeReferencesWithin = Function.flip(foldAst(appendTypeReference))(emptyTypeReferences)

export const localTypeReferenceTargets = (
  checker: ts.TypeChecker,
  node: ts.TypeReferenceNode
): ReadonlyArray<ts.TypeReferenceNode> =>
  pipe(
    checker.getSymbolAtLocation(node.typeName),
    Option.fromNullishOr,
    Option.map((symbol) => {
      const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

      return isAlias ? checker.getAliasedSymbol(symbol) : symbol
    }),
    Option.map((symbol) => symbol.declarations ?? emptyDeclarations),
    Option.map(
      Array.flatMap((declaration): ReadonlyArray<ts.TypeReferenceNode> => {
        const sourceFile = declaration.getSourceFile()
        const isProject = isProjectFile(sourceFile)

        if (!isProject) {
          return emptyTypeReferences
        }

        return pipe(
          Match.value(declaration),
          Match.when(ts.isTypeAliasDeclaration, (alias) => typeReferencesWithin(alias.type)),
          Match.when(ts.isInterfaceDeclaration, typeReferencesWithin),
          Match.orElse(Function.constant(emptyTypeReferences))
        )
      })
    ),
    Option.getOrElse(Function.constant(emptyTypeReferences))
  )

export const typeReferenceIsGlobalPromise = (context: CheckContext, node: ts.TypeReferenceNode) =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(node.typeName),
    Option.filter((typeName) => typeName.text === "Promise"),
    Option.flatMap(
      flow((typeName) => context.checker.getSymbolAtLocation(typeName), Option.fromNullishOr)
    ),
    Option.map((symbol) => symbol.declarations ?? emptyDeclarations),
    Option.exists((declarations) =>
      Array.some(
        declarations,
        flow(
          (declaration: ts.Declaration) => declaration.getSourceFile(),
          (sourceFile) => context.program.isSourceFileDefaultLibrary(sourceFile)
        )
      )
    )
  )

export const effectApiMember = (
  member: ImportedMember,
  namespace: string,
  names: ReadonlyArray<string>
) => {
  const last = pipe(Array.last(member.path), Option.getOrElse(Function.constant("")))
  const fromBarrelPath = member.path[0] === namespace
  const fromEffectBarrel = member.moduleSpecifier === "effect"
  const fromBarrel = fromEffectBarrel && fromBarrelPath
  const fromSubpath = member.moduleSpecifier === `effect/${namespace}`
  const fromEffectModule = fromBarrel || fromSubpath
  const nameMatches = Array.contains(names, last)
  const matchFlags = Array.make(fromEffectModule, nameMatches)

  return Array.every(matchFlags, Boolean)
}

export const importedEffectApiAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  namespace: string,
  names: ReadonlyArray<string>
) =>
  pipe(
    importedMemberAt(checker, expression),
    Option.exists((member) => effectApiMember(member, namespace, names))
  )

const isEffectManagedRuntimeSource = (sourceFile: ts.SourceFile) => {
  const normalized = sourceFile.fileName.replaceAll("\\", "/")

  const installed =
    normalized.includes("/node_modules/effect/") && normalized.endsWith("/ManagedRuntime.d.ts")

  const vendored = normalized.endsWith("/packages/effect/src/ManagedRuntime.ts")

  return installed || vendored
}

export const isManagedRuntimeMethodAccess = (
  checker: ts.TypeChecker,
  node: ts.PropertyAccessExpression,
  names: ReadonlyArray<string>
) => {
  const nameMatches = Array.contains(names, node.name.text)

  const managedRuntime = pipe(
    node.name,
    (nameNode) => checker.getSymbolAtLocation(nameNode),
    Option.fromNullishOr,
    Option.map((symbol) => symbol.declarations ?? emptyDeclarations),
    Option.exists((declarations) =>
      Array.some(
        declarations,
        flow((declaration) => declaration.getSourceFile(), isEffectManagedRuntimeSource)
      )
    )
  )

  const matchFlags = Array.make(nameMatches, managedRuntime)

  return Array.every(matchFlags, Boolean)
}

export const importedEffectApiSubject = (checker: ts.TypeChecker, expression: ts.Expression) =>
  pipe(
    importedMemberAt(checker, expression),
    Option.map((member) => {
      const memberPath = Array.join(member.path, ".")
      return `${member.moduleSpecifier}:${memberPath}`
    })
  )

export const classExtendsEffectApi = (
  checker: ts.TypeChecker,
  declaration: ts.ClassDeclaration,
  namespace: string,
  memberName: string
) => {
  const clauses = declaration.heritageClauses ?? emptyHeritageClauses
  const names = Array.of(memberName)

  return Array.some(clauses, (clause) =>
    Array.some(clause.types, (heritage) => {
      const callee = unwrapCallee(heritage.expression)
      return importedEffectApiAt(checker, callee, namespace, names)
    })
  )
}

const effectServiceMakerObject = (
  expression: ts.Expression
): Option.Option<ts.ObjectLiteralExpression> => {
  if (!ts.isCallExpression(expression)) {
    return Option.none()
  }

  const maker = pipe(
    Option.fromNullishOr(expression.arguments[1]),
    Option.filter(ts.isObjectLiteralExpression)
  )

  return Option.isSome(maker) ? maker : effectServiceMakerObject(expression.expression)
}

const contextServiceNames = Array.of("Service")

export const effectServiceConfigObject = (
  checker: ts.TypeChecker,
  declaration: ts.ClassDeclaration
) =>
  pipe(
    declaration.heritageClauses ?? emptyHeritageClauses,
    Array.flatMap((clause) => Array.fromIterable(clause.types)),
    Array.findFirst(
      flow(
        (heritage) => unwrapCallee(heritage.expression),
        (callee) => importedEffectApiAt(checker, callee, "Context", contextServiceNames)
      )
    ),
    Option.flatMap((heritage) => effectServiceMakerObject(heritage.expression))
  )

const propertyNameText = (name: ts.PropertyName) =>
  pipe(
    Match.value(name),
    Match.when(ts.isIdentifier, (identifier) => Option.some(identifier.text)),
    Match.when(ts.isStringLiteralLike, (literal) => Option.some(literal.text)),
    Match.when(ts.isNumericLiteral, (literal) => Option.some(literal.text)),
    Match.when(ts.isComputedPropertyName, (computed) =>
      pipe(
        Option.liftPredicate(ts.isStringLiteralLike)(computed.expression),
        Option.map(Struct.get("text"))
      )
    ),
    Match.orElse(() => Option.none())
  )

export const propertyAssignmentNamed = (
  object: ts.ObjectLiteralExpression,
  names: ReadonlyArray<string>
) =>
  Array.findFirst(
    object.properties,
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      pipe(
        propertyNameText(property.name),
        Option.exists((name) => Array.contains(names, name))
      )
  )

const contextServiceLayerPropertyNames = Array.of("layer")

const hasStaticModifier = (declaration: ts.PropertyDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.modifiers),
    Option.exists((modifiers) =>
      Array.some(modifiers, (modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)
    )
  )

const hasLayerStaticProperty = (declaration: ts.PropertyDeclaration) =>
  hasStaticModifier(declaration) &&
  pipe(
    propertyNameText(declaration.name),
    Option.exists((name) => Array.contains(contextServiceLayerPropertyNames, name))
  )

export const contextServiceLayerProperty = (declaration: ts.ClassDeclaration) =>
  Array.findFirst(
    declaration.members,
    (member): member is ts.PropertyDeclaration =>
      ts.isPropertyDeclaration(member) && hasLayerStaticProperty(member)
  )

const contextReferenceNames = Array.of("Reference")

const resolvedSymbolAtNode = (checker: ts.TypeChecker) => (node: ts.Node) =>
  pipe(
    checker.getSymbolAtLocation(node),
    Option.fromNullishOr,
    Option.map((symbol) => {
      const alias = (symbol.flags & ts.SymbolFlags.Alias) !== 0
      return alias ? checker.getAliasedSymbol(symbol) : symbol
    })
  )

const callConstructsContextApi = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  names: ReadonlyArray<string>
): boolean => {
  const current = unwrapTransparentExpression(expression)

  if (!ts.isCallExpression(current)) {
    return importedEffectApiAt(checker, current, "Context", names)
  }

  const callee = unwrapCallee(current.expression)
  const direct = importedEffectApiAt(checker, callee, "Context", names)
  return direct || callConstructsContextApi(checker, current.expression, names)
}

const declarationInitializesContextApi = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
  names: ReadonlyArray<string>
) =>
  pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(declaration),
    Option.flatMap((variable) => Option.fromNullishOr(variable.initializer)),
    Option.exists((initializer) => callConstructsContextApi(checker, initializer, names))
  )

export const declarationIsContextService = (checker: ts.TypeChecker, declaration: ts.Declaration) =>
  pipe(
    Option.liftPredicate(ts.isClassDeclaration)(declaration),
    Option.exists((classDeclaration) =>
      classExtendsEffectApi(checker, classDeclaration, "Context", "Service")
    )
  ) || declarationInitializesContextApi(checker, declaration, contextServiceNames)

export const declarationIsContextReference = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration
) => declarationInitializesContextApi(checker, declaration, contextReferenceNames)

export const expressionIsServiceTag = (checker: ts.TypeChecker, expression: ts.Expression) =>
  pipe(
    expression,
    unwrapTransparentExpression,
    resolvedSymbolAtNode(checker),
    Option.map((symbol) => symbol.declarations ?? emptyDeclarations),
    Option.exists((declarations) =>
      Array.some(
        declarations,
        (declaration) =>
          declarationIsContextService(checker, declaration) ||
          declarationIsContextReference(checker, declaration)
      )
    )
  )

const provideServiceNames = Array.of("provideService")

const provideServiceTagArgument = (node: ts.CallExpression) => {
  const args = Array.fromIterable(node.arguments)
  const tagIndex = args.length >= 3 ? 1 : 0

  return Option.fromNullishOr(args[tagIndex])
}

export const callIsReferenceProvideService = (checker: ts.TypeChecker, node: ts.CallExpression) => {
  const isProvideService = importedEffectApiAt(
    checker,
    node.expression,
    "Effect",
    provideServiceNames
  )

  const referenceOverride = pipe(
    provideServiceTagArgument(node),
    Option.map(unwrapTransparentExpression),
    Option.flatMap(resolvedSymbolAtNode(checker)),
    Option.map((symbol) => symbol.declarations ?? emptyDeclarations),
    Option.exists((declarations) =>
      Array.some(declarations, (declaration) => declarationIsContextReference(checker, declaration))
    )
  )

  const checks = Array.make(isProvideService, referenceOverride)

  return Array.every(checks, Boolean)
}

export const expressionIsEffectRuntimeRunner = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  runtimeNames: ReadonlyArray<string>
) => {
  const current = unwrapTransparentExpression(expression)
  const direct = importedEffectApiAt(checker, current, "Effect", runtimeNames)

  const curried = pipe(
    Option.liftPredicate(ts.isCallExpression)(current),
    Option.exists((call) => importedEffectApiAt(checker, call.expression, "Effect", runtimeNames))
  )

  const checks = Array.make(direct, curried)

  return Array.some(checks, Boolean)
}

export const callIsPipeRuntimeHandoff = (
  checker: ts.TypeChecker,
  node: ts.CallExpression,
  runtimeNames: ReadonlyArray<string>
) => {
  const callee = unwrapTransparentExpression(node.expression)

  const isPipe = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
    Option.exists((access) => access.name.text === "pipe")
  )

  const hasRunner = Array.some(node.arguments, (argument) =>
    expressionIsEffectRuntimeRunner(checker, argument, runtimeNames)
  )

  const checks = Array.make(isPipe, hasRunner)

  return Array.every(checks, Boolean)
}

const effectBarrelPlatformCapabilityNames: Readonly<Record<string, true>> = {
  FileSystem: true,
  Terminal: true,
  Path: true
}

const unstableHttpNamespaces = Array.make("http", "httpapi")

export const importedMemberIsMovedPlatformCapability = (member: ImportedMember) => {
  const fromEffectBarrel = member.moduleSpecifier === "effect"

  const isMovedBarrelMember = pipe(
    Option.fromNullishOr(member.path[0]),
    Option.exists((name) => effectBarrelPlatformCapabilityNames[name] === true)
  )

  const barrelChecks = Array.make(fromEffectBarrel, isMovedBarrelMember)
  const fromBarrel = Array.every(barrelChecks, Boolean)

  const isUnstableNamespace = pipe(
    Option.fromNullishOr(member.path[0]),
    Option.exists((name) => name === "unstable")
  )

  const isHttpNamespace = pipe(
    Option.fromNullishOr(member.path[1]),
    Option.exists((name) => Array.contains(unstableHttpNamespaces, name))
  )

  const unstableChecks = Array.make(fromEffectBarrel, isUnstableNamespace, isHttpNamespace)
  const fromUnstableHttp = Array.every(unstableChecks, Boolean)
  const capabilitySources = Array.make(fromBarrel, fromUnstableHttp)

  return Array.some(capabilitySources, Boolean)
}

export const effectServiceConfigFromExpression = (
  checker: ts.TypeChecker,
  expression: ts.Expression
) => {
  const current = unwrapTransparentExpression(expression)
  const isContextService = callConstructsContextApi(checker, current, contextServiceNames)
  const keepContextService = Function.constant(isContextService)

  return pipe(
    current,
    Option.liftPredicate(keepContextService),
    Option.flatMap(effectServiceMakerObject)
  )
}

export const resolvedModuleSourceFile = (
  context: CheckContext,
  declaration: ts.ImportDeclaration | ts.ExportDeclaration
) => {
  const moduleSpecifier = declaration.moduleSpecifier

  const checkerSource = pipe(
    Option.fromNullishOr(moduleSpecifier),
    Option.flatMap((specifier) =>
      pipe(
        context.checker.getSymbolAtLocation(specifier),
        Option.fromNullishOr,
        Option.map((symbol) => symbol.declarations ?? emptyDeclarations),
        Option.flatMap((declarations) => Array.findFirst(declarations, ts.isSourceFile))
      )
    )
  )

  if (Option.isSome(checkerSource)) {
    return checkerSource
  }

  const specifier = pipe(
    Option.fromNullishOr(moduleSpecifier),
    Option.filter(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

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
    Option.flatMap((resolved) =>
      pipe(context.program.getSourceFile(resolved.resolvedFileName), Option.fromNullishOr)
    )
  )
}

export const moduleMatchesPolicyPrefix = (
  policy: FunctionalCoreEffectPolicy,
  moduleSpecifier: string
) =>
  Array.some(policy.capabilityModulePrefixes, (prefix) => {
    const namespacePrefix = prefix.endsWith(":")
    const namespaceMatch = namespacePrefix && moduleSpecifier.startsWith(prefix)
    const packagePrefix = `${prefix}/`
    const exactPackage = moduleSpecifier === prefix
    const nestedPackage = moduleSpecifier.startsWith(packagePrefix)
    const packageMatch = exactPackage || nestedPackage
    const matchFlags = Array.make(namespaceMatch, packageMatch)

    return Array.some(matchFlags, Boolean)
  })

const namedImportsHaveRuntimeValue = (bindings: ts.NamedImports) =>
  Array.some(bindings.elements, (specifier) => !specifier.isTypeOnly)

export const importHasRuntimeValue = (declaration: ts.ImportDeclaration) =>
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
                Match.value(bindings),
                Match.when(ts.isNamespaceImport, Function.constTrue),
                Match.when(ts.isNamedImports, namedImportsHaveRuntimeValue),
                Match.exhaustive
              )
          })
        )

        const hasRuntimeBinding = hasDefaultName || hasNamedRuntime
        const matchFlags = Array.make(isValueImport, hasRuntimeBinding)

        return Array.every(matchFlags, Boolean)
      }
    })
  )

const symbolIsAmbient = (checker: ts.TypeChecker, identifier: ts.Identifier) =>
  pipe(
    checker.getSymbolAtLocation(identifier),
    Option.fromNullishOr,
    Option.map((symbol) => symbol.declarations ?? emptyDeclarations),
    Option.exists((declarations) => {
      const hasDeclaration = declarations.length > 0

      const hasProjectDeclaration = Array.some(
        declarations,
        flow((declaration) => declaration.getSourceFile(), isProjectFile)
      )

      const notProjectDeclaration = !hasProjectDeclaration
      const ambientFlags = Array.make(hasDeclaration, notProjectDeclaration)

      return Array.every(ambientFlags, Boolean)
    })
  )

const ambientPathAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression
): Option.Option<ReadonlyArray<string>> =>
  pipe(
    expressionPath(expression),
    Option.filter((path) => symbolIsAmbient(checker, path[0])),
    Option.map((path) => Array.prepend(path[1], path[0].text))
  )

const ambientDirectNames = Array.make(
  "fetch",
  "setTimeout",
  "setInterval",
  "setImmediate",
  "queueMicrotask"
)

const ambientExactMembers = Array.make("Date.now", "Math.random", "crypto.randomUUID")

const ambientCallSubject = (checker: ts.TypeChecker, expression: ts.Expression) =>
  pipe(
    ambientPathAt(checker, expression),
    Option.filter((path) => {
      const joined = Array.join(path, ".")
      const isSingleSegment = path.length === 1
      const directMatch = isSingleSegment && Array.contains(ambientDirectNames, joined)
      const exactMatch = Array.contains(ambientExactMembers, joined)
      const receiver = path[0]
      const isLocalStorage = receiver === "localStorage"
      const isSessionStorage = receiver === "sessionStorage"
      const storageMatch = isLocalStorage || isSessionStorage
      const consoleMatch = receiver === "console"
      const ambientFlags = Array.make(directMatch, exactMatch, storageMatch, consoleMatch)

      return Array.some(ambientFlags, Boolean)
    }),
    Option.map(Array.join("."))
  )

export const capabilitySubjectAt = (
  context: CheckContext,
  policy: FunctionalCoreEffectPolicy,
  node: ts.CallExpression | ts.NewExpression
) => {
  const newDate = pipe(
    Option.liftPredicate(ts.isNewExpression)(node),
    Option.filter((expression) => (expression.arguments?.length ?? 0) === 0),
    Option.flatMap((expression) =>
      pipe(
        ambientPathAt(context.checker, expression.expression),
        Option.filter((path) => Array.join(path, ".") === "Date"),
        Option.as("new Date")
      )
    )
  )

  const ambient = ambientCallSubject(context.checker, node.expression)

  const imported = pipe(
    importedMemberAt(context.checker, node.expression),
    Option.filter(
      (member) =>
        moduleMatchesPolicyPrefix(policy, member.moduleSpecifier) ||
        importedMemberIsMovedPlatformCapability(member)
    ),
    Option.map((member) => {
      const memberPath = Array.join(member.path, ".")
      return `${member.moduleSpecifier}:${memberPath}`
    })
  )

  const candidates = Array.make(newDate, ambient, imported)

  return Option.firstSomeOf(candidates)
}

export const ambientCapabilityPropertySubject = (
  context: CheckContext,
  node: ts.PropertyAccessExpression
) =>
  pipe(
    ambientPathAt(context.checker, node),
    Option.filter((path) => Array.join(path, ".") === "process.env"),
    Option.map(Array.join("."))
  )

const suspensionNames = Array.make("callback", "promise", "suspend", "sync", "try", "tryPromise")

const effectLifecycleNames = Array.make(
  "acquireRelease",
  "acquireUseRelease",
  "acquireDisposable",
  "addFinalizer"
)

const tryEffectNames = Array.make("try", "tryPromise")

const runtimeFunctionLikeKinds = HashSet.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor
)

export const isRuntimeFunctionLike = (node: ts.Node): node is ts.FunctionLikeDeclaration =>
  HashSet.has(runtimeFunctionLikeKinds, node.kind)

const functionIsSuspensionCallback = (
  checker: ts.TypeChecker,
  declaration: ts.FunctionLikeDeclaration
) => {
  const parent = declaration.parent

  if (ts.isCallExpression(parent)) {
    const isArgument = Array.some(parent.arguments, (argument) => argument === declaration)
    const isSuspension = importedEffectApiAt(checker, parent.expression, "Effect", suspensionNames)

    return isArgument && isSuspension
  }

  return pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(parent),
    Option.filter((assignment) => assignment.initializer === declaration),
    Option.flatMap((assignment) =>
      pipe(
        Match.value(assignment.name),
        Match.when(ts.isIdentifier, Struct.get<ts.Identifier, "text">("text")),
        Match.when(ts.isStringLiteralLike, Struct.get<ts.StringLiteralLike, "text">("text")),
        Match.orElse(Function.constant("")),
        Option.liftPredicate((text) => text === "try"),
        Option.map(() => assignment.parent),
        Option.filter(ts.isObjectLiteralExpression),
        Option.map(Struct.get("parent")),
        Option.filter(ts.isCallExpression),
        Option.map((call) =>
          importedEffectApiAt(checker, call.expression, "Effect", tryEffectNames)
        )
      )
    ),
    Option.getOrElse(Function.constFalse)
  )
}

export const hasSuspensionBoundary = (checker: ts.TypeChecker, node: ts.Node) => {
  const visit = (current: ts.Node): boolean => {
    const isSuspensionCallback =
      isRuntimeFunctionLike(current) && functionIsSuspensionCallback(checker, current)

    return isSuspensionCallback
      ? true
      : pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
  }

  return visit(node)
}

export const hasEffectCallAncestor = (
  checker: ts.TypeChecker,
  node: ts.Node,
  namespace: string,
  names: ReadonlyArray<string>
) => {
  const visit = (current: ts.Node): boolean => {
    const matchingCall =
      ts.isCallExpression(current) &&
      importedEffectApiAt(checker, current.expression, namespace, names)

    return matchingCall ? true : pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
  }

  return visit(node)
}

const externalImportedMemberAt = (checker: ts.TypeChecker, expression: ts.Expression) =>
  pipe(
    importedMemberAt(checker, expression),
    Option.filter((member) => {
      const relative = member.moduleSpecifier.startsWith(".")
      const absolute = member.moduleSpecifier.startsWith("/")
      const notRelative = !relative
      const notAbsolute = !absolute
      const externalFlags = Array.make(notRelative, notAbsolute)

      return Array.every(externalFlags, Boolean)
    })
  )

export const resourceSubjectAt = (
  context: CheckContext,
  policy: FunctionalCoreEffectPolicy,
  node: ts.CallExpression | ts.NewExpression
) =>
  pipe(
    externalImportedMemberAt(context.checker, node.expression),
    Option.filter((member) => {
      const name = pipe(Array.last(member.path), Option.getOrElse(Function.constant("")))
      const factoryMatch = Array.contains(policy.resourceFactoryNames, name)
      const suffixMatch = Array.some(policy.resourceTypeSuffixes, (suffix) => name.endsWith(suffix))
      const isNewExpression = ts.isNewExpression(node)
      const newSuffixMatch = isNewExpression && suffixMatch

      return factoryMatch || newSuffixMatch
    }),
    Option.map((member) => {
      const memberPath = Array.join(member.path, ".")
      return `${member.moduleSpecifier}:${memberPath}`
    })
  )

export const hasScopedLifecycleAncestor = (checker: ts.TypeChecker, node: ts.Node) => {
  const scopedEffect = hasEffectCallAncestor(checker, node, "Effect", effectLifecycleNames)
  const hasSuspension = hasSuspensionBoundary(checker, node)
  const scopedFlags = Array.make(scopedEffect, hasSuspension)

  return Array.every(scopedFlags, Boolean)
}

export const enclosingFunctionLike = (node: ts.Node): Option.Option<ts.FunctionLikeDeclaration> =>
  pipe(
    Option.fromNullishOr(node.parent),
    Option.flatMap((parent) =>
      isRuntimeFunctionLike(parent) ? Option.some(parent) : enclosingFunctionLike(parent)
    )
  )

const enclosingVariableNameNode = (node: ts.Node): Option.Option<ts.Identifier> =>
  pipe(
    Option.fromNullishOr(node.parent),
    Option.flatMap((parent) => {
      if (ts.isVariableDeclaration(parent)) {
        return Option.liftPredicate(ts.isIdentifier)(parent.name)
      }

      const stopsWalk = ts.isSourceFile(parent) || isRuntimeFunctionLike(parent)

      return stopsWalk ? Option.none() : enclosingVariableNameNode(parent)
    })
  )

const declarationNameNode = (declaration: ts.FunctionLikeDeclaration) => {
  const isFunctionDeclaration = ts.isFunctionDeclaration(declaration)
  const isFunctionExpression = ts.isFunctionExpression(declaration)
  const isMethod = ts.isMethodDeclaration(declaration)
  const namedFunctionFlags = Array.make(isFunctionDeclaration, isFunctionExpression, isMethod)
  const isNamedFunction = Array.some(namedFunctionFlags, Boolean)

  if (!isNamedFunction) {
    return enclosingVariableNameNode(declaration)
  }

  const directName = pipe(Option.fromNullishOr(declaration.name), Option.filter(ts.isIdentifier))
  const hasDirectName = Option.isSome(directName)
  const keepDirectFlags = Array.make(hasDirectName, isMethod)
  const keepDirect = Array.some(keepDirectFlags, Boolean)

  return keepDirect ? directName : enclosingVariableNameNode(declaration)
}

export const sourceFileScopesFunction = (context: CheckContext, node: ts.Node) =>
  pipe(
    enclosingFunctionLike(node),
    Option.flatMap(declarationNameNode),
    Option.flatMap(
      flow((name: ts.Identifier) => context.checker.getSymbolAtLocation(name), Option.fromNullishOr)
    ),
    Option.exists((scopedSymbol) =>
      foldAst((found: boolean, current: ts.Node): boolean => {
        const isCall = ts.isCallExpression(current)
        const notCall = !isCall
        const skipNode = found || notCall

        if (skipNode) {
          return found
        }

        const isScoped = importedEffectApiAt(
          context.checker,
          current.expression,
          "Effect",
          effectLifecycleNames
        )

        if (!isScoped) {
          return found
        }

        return foldAst((referenced: boolean, child: ts.Node): boolean => {
          const isIdentifier = ts.isIdentifier(child)
          const notIdentifier = !isIdentifier
          const skipChild = referenced || notIdentifier

          if (skipChild) {
            return referenced
          }

          const symbol = context.checker.getSymbolAtLocation(child)

          return symbol === scopedSymbol
        })(current)(false)
      })(context.sourceFile)(false)
    )
  )

export const isTopLevelExportedDeclaration = (node: ts.Node) => {
  const visitParent = (current: ts.Node): boolean =>
    pipe(
      Option.fromNullishOr(current.parent),
      Option.filter(Predicate.not(ts.isSourceFile)),
      Option.exists(visit)
    )

  const visit = (current: ts.Node): boolean =>
    pipe(
      Option.liftPredicate(ts.isStatement)(current),
      Option.filter((statement) => statement.parent.kind === ts.SyntaxKind.SourceFile),
      Option.match({
        onNone: () => visitParent(current),
        onSome: hasExportModifier
      })
    )

  return visit(node)
}
