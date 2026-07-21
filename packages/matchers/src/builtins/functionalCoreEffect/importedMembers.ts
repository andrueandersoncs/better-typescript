import { Array, Data, Function, Match, Option, Struct, Tuple, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import { foldAst } from "@better-typescript/matchers/sources"
import {
  isProjectFile,
  symbolDeclarations,
  unwrapTransparentExpression
} from "../../support/tsNode.js"
import { optionalStringLiteralLikeText } from "../../support/stringLiteralText.js"

// ImportedMember is shared specifier and member-path pair because helpers exchange one binding.
export class ImportedMember extends Data.Class<{
  readonly moduleSpecifier: string
  readonly path: ReadonlyArray<string>
}> {}

export const importedMemberSubject = (member: ImportedMember) =>
  `${member.moduleSpecifier}:${Array.join(member.path, ".")}`

const emptyMemberPath: ReadonlyArray<string> = Array.empty()

const emptyTypeReferences: ReadonlyArray<ts.TypeReferenceNode> = Array.empty()

export const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()

export const declarationsOfSymbol = (symbol: ts.Symbol): ReadonlyArray<ts.Declaration> =>
  symbolDeclarations(symbol) ?? emptyDeclarations

export const emptyHeritageClauses: ReadonlyArray<ts.HeritageClause> = Array.empty()

const moduleDeclarationAncestor = (
  node: ts.Node
): Option.Option<ts.ImportDeclaration | ts.ExportDeclaration> => {
  const isModuleDeclaration = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)

  return isModuleDeclaration
    ? Option.some(node)
    : pipe(Option.fromNullishOr(node.parent), Option.flatMap(moduleDeclarationAncestor))
}

export const moduleSpecifierText = flow(
  Struct.get<ts.ImportDeclaration | ts.ExportDeclaration, "moduleSpecifier">("moduleSpecifier"),
  Option.fromNullishOr,
  optionalStringLiteralLikeText
)

const identifierEmptyPath = (identifier: ts.Identifier) => Tuple.make(identifier, emptyMemberPath)

const makePathWithMember =
  (memberName: string) => (path: readonly [ts.Identifier, ReadonlyArray<string>]) => {
    const root = Tuple.get(path, 0)
    const existing = Tuple.get(path, 1)
    const members = Array.append(existing, memberName)

    return Tuple.make(root, members)
  }

export const expressionPath = (
  expression: ts.Expression
): Option.Option<readonly [ts.Identifier, ReadonlyArray<string>]> =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(ts.isIdentifier, flow(identifierEmptyPath, Option.some)),
    Match.when(ts.isPropertyAccessExpression, (access) => {
      const memberName = access.name.text

      return pipe(expressionPath(access.expression), Option.map(makePathWithMember(memberName)))
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
        Option.map(({ base, member }) => makePathWithMember(member)(base))
      )
    }),
    Match.orElse(() => Option.none())
  )

const identifierEmptyPath2 = (identifier: ts.Identifier) => Tuple.make(identifier, emptyMemberPath)

const qualifiedNamePath = (qualifiedName: ts.QualifiedName) =>
  pipe(entityNamePath(qualifiedName.left), makePathWithMember(qualifiedName.right.text))

const entityNamePath = (name: ts.EntityName): readonly [ts.Identifier, ReadonlyArray<string>] =>
  pipe(
    Match.value(name),
    Match.when(ts.isIdentifier, identifierEmptyPath2),
    Match.orElse(qualifiedNamePath)
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

const makeNamespaceImportedMemberFromModuleSpecifier = (moduleSpecifier: string) =>
  new ImportedMember({
    moduleSpecifier,
    path: emptyMemberPath
  })

const makeDefaultImportedMemberFromModuleSpecifier = (moduleSpecifier: string) => {
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
    Option.flatMap((specifier) => {
      const importSpecifierBinding = (importSpecifier: ts.ImportSpecifier) =>
        bindingFromNamedSpecifier(specifier, importSpecifier)

      const exportSpecifierBinding = (exportSpecifier: ts.ExportSpecifier) =>
        bindingFromNamedSpecifier(specifier, exportSpecifier)

      const defaultBindingFromImportClause = (importClause: ts.ImportClause) =>
        pipe(
          Option.fromNullishOr(importClause.name),
          Option.map(() => makeDefaultImportedMemberFromModuleSpecifier(specifier))
        )

      return pipe(
        Match.value(declaration),
        Match.when(ts.isImportSpecifier, flow(importSpecifierBinding, Option.some)),
        Match.when(ts.isExportSpecifier, flow(exportSpecifierBinding, Option.some)),
        Match.when(
          ts.isNamespaceImport,
          flow(
            Function.constant(specifier),
            makeNamespaceImportedMemberFromModuleSpecifier,
            Option.some
          )
        ),
        Match.when(
          ts.isNamespaceExport,
          flow(
            Function.constant(specifier),
            makeNamespaceImportedMemberFromModuleSpecifier,
            Option.some
          )
        ),
        Match.when(ts.isImportClause, defaultBindingFromImportClause),
        Match.orElse(() => Option.none())
      )
    })
  )
}

const maximumBarrelDepth = 8

const declarationHasBinding = flow(bindingFromDeclaration, Option.isSome)

const someOf = (symbol: ts.Symbol) => {
  const declarations = declarationsOfSymbol(symbol)

  return Array.some(
    declarations,
    flow((candidate: ts.Declaration) => candidate.getSourceFile(), isProjectFile)
  )
}

const pipeOf2 = (symbol: ts.Symbol) =>
  pipe(declarationsOfSymbol(symbol), Array.findFirst(declarationHasBinding))

const resolvedBarrelBinding = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
  binding: ImportedMember,
  depth: number
): ImportedMember => {
  const depthExhausted = strictEqual(0)(depth)
  const pathExhausted = strictEqual(0)(binding.path.length)
  const exhausted = depthExhausted || pathExhausted

  if (exhausted) {
    return binding
  }

  const pipeOf = (moduleDeclaration: ts.ImportDeclaration | ts.ExportDeclaration) =>
    pipe(
      Option.fromNullishOr(moduleDeclaration.moduleSpecifier),
      Option.flatMap(
        flow(
          (moduleSpecifier) => checker.getSymbolAtLocation(moduleSpecifier),
          Option.fromNullishOr
        )
      )
    )

  const moduleSymbol = pipe(moduleDeclarationAncestor(declaration), Option.flatMap(pipeOf))
  const firstPartyModule = pipe(moduleSymbol, Option.exists(someOf))
  const missingModule = Option.isNone(moduleSymbol)
  const externalModule = !firstPartyModule
  const keepBinding = externalModule || missingModule

  if (keepBinding) {
    return binding
  }

  const pathHead = Array.head(binding.path)
  const importedName = pipe(pathHead, Option.getOrElse(Function.constant("")))
  const symbolNamed = flow(Struct.get<ts.Symbol, "name">("name"), strictEqual(importedName))

  const next = pipe(
    checker.getExportsOfModule(moduleSymbol.value),
    Array.findFirst(symbolNamed),
    Option.flatMap(pipeOf2),
    Option.flatMap((candidate) => {
      const makeOf = (candidateBinding: ImportedMember) => Tuple.make(candidate, candidateBinding)
      return pipe(bindingFromDeclaration(candidate), Option.map(makeOf))
    })
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
) => {
  const pipeOf3 = (declaration: ts.Declaration) =>
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

  return pipe(
    checker.getSymbolAtLocation(identifier),
    Option.fromNullishOr,
    Option.map(declarationsOfSymbol),
    Option.flatMap(Array.findFirst(declarationHasBinding)),
    Option.flatMap(pipeOf3)
  )
}

const importedMemberFromPath = (
  checker: ts.TypeChecker,
  path: readonly [ts.Identifier, ReadonlyArray<string>]
) => {
  const root = Tuple.get(path, 0)
  const members = Tuple.get(path, 1)

  return importBindingAt(checker, root, members)
}

export const importedMemberAt = (checker: ts.TypeChecker, expression: ts.Expression) => {
  const memberFromPath = (path: readonly [ts.Identifier, ReadonlyArray<string>]) =>
    importedMemberFromPath(checker, path)

  return pipe(expressionPath(expression), Option.flatMap(memberFromPath))
}

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

const typeReferencesWithinAlias = (alias: ts.TypeAliasDeclaration) =>
  typeReferencesWithin(alias.type)

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
    Option.map(declarationsOfSymbol),
    Option.map(
      Array.flatMap((declaration): ReadonlyArray<ts.TypeReferenceNode> => {
        const sourceFile = declaration.getSourceFile()
        const isProject = isProjectFile(sourceFile)

        if (!isProject) {
          return emptyTypeReferences
        }

        return pipe(
          Match.value(declaration),
          Match.when(ts.isTypeAliasDeclaration, typeReferencesWithinAlias),
          Match.when(ts.isInterfaceDeclaration, typeReferencesWithin),
          Match.orElse(Function.constant(emptyTypeReferences))
        )
      })
    ),
    Option.getOrElse(Function.constant(emptyTypeReferences))
  )

export const typeReferenceIsGlobalPromise = (context: MatchContext, node: ts.TypeReferenceNode) => {
  const someOf2 = (declarations: ReadonlyArray<ts.Declaration>) =>
    Array.some(
      declarations,
      flow(
        (declaration: ts.Declaration) => declaration.getSourceFile(),
        (sourceFile: ts.SourceFile) => context.program.isSourceFileDefaultLibrary(sourceFile)
      )
    )

  const typeNameIsPromise = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Promise"))

  return pipe(
    Option.liftPredicate(ts.isIdentifier)(node.typeName),
    Option.filter(typeNameIsPromise),
    Option.flatMap(
      flow((typeName) => context.checker.getSymbolAtLocation(typeName), Option.fromNullishOr)
    ),
    Option.map(declarationsOfSymbol),
    Option.exists(someOf2)
  )
}
