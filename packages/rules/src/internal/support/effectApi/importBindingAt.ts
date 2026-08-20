import { Array, Function, Match, Option, Struct, Tuple, flow, pipe } from "effect"
import { strictEqual } from "../../equivalence.js"
import * as ts from "typescript"
import { isProjectFile } from "../isProjectFile.js"
import { ImportedMember } from "./importedMember.js"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"
import { emptyMemberPath } from "./emptyMemberPath.js"
import { moduleSpecifierText } from "./moduleSpecifierText.js"

const makeImportedMemberFromPath = () => {
  const moduleDeclarationAncestor = (
    node: ts.Node
  ): Option.Option<ts.ImportDeclaration | ts.ExportDeclaration> => {
    const isModuleDeclaration = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)

    return isModuleDeclaration
      ? Option.some(node)
      : pipe(Option.fromNullishOr(node.parent), Option.flatMap(moduleDeclarationAncestor))
  }

  const makeNamedImportedFromDeclaration =
    (moduleSpecifier: string) => (declaration: ts.ImportSpecifier | ts.ExportSpecifier) => {
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

  const importedFromDeclaration = (declaration: ts.Declaration) => {
    const moduleDeclaration = moduleDeclarationAncestor(declaration)
    const moduleSpecifier = pipe(moduleDeclaration, Option.flatMap(moduleSpecifierText))

    return pipe(
      moduleSpecifier,
      Option.flatMap((specifier) => {
        const defaultBindingFromImportClause = (importClause: ts.ImportClause) =>
          pipe(
            Option.fromNullishOr(importClause.name),
            Option.map(() => makeDefaultImportedMemberFromModuleSpecifier(specifier))
          )

        return pipe(
          Match.value(declaration),
          Match.when(
            ts.isImportSpecifier,
            flow(makeNamedImportedFromDeclaration(specifier), Option.some)
          ),
          Match.when(
            ts.isExportSpecifier,
            flow(makeNamedImportedFromDeclaration(specifier), Option.some)
          ),
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

  const declarationHasBinding = flow(importedFromDeclaration, Option.isSome)
  const maximumBarrelDepth = 8

  const someOf = (symbol: ts.Symbol) => {
    const declarations = declarationsOfSymbol(symbol)

    return Array.some(
      declarations,
      flow((candidate: ts.Declaration) => candidate.getSourceFile(), isProjectFile)
    )
  }

  const pipeOf2 = (symbol: ts.Symbol) =>
    pipe(declarationsOfSymbol(symbol), Array.findFirst(declarationHasBinding))

  const resolvedBarrelBinding =
    (checker: ts.TypeChecker) =>
    (depth: number) =>
    (declaration: ts.Declaration) =>
    (binding: ImportedMember): ImportedMember => {
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
          const makeOf = (candidateBinding: ImportedMember) =>
            Tuple.make(candidate, candidateBinding)

          return pipe(importedFromDeclaration(candidate), Option.map(makeOf))
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

      return resolvedBarrelBinding(checker)(depth - 1)(nextDeclaration)(completeNextBinding)
    }

  const importBindingAt =
    (checker: ts.TypeChecker) =>
    (members: ReadonlyArray<string>) =>
    (identifier: ts.Identifier) => {
      const pipeOf3 = (declaration: ts.Declaration) =>
        pipe(
          importedFromDeclaration(declaration),
          Option.map((binding) => {
            const path = Array.appendAll(binding.path, members)

            const completeBinding = new ImportedMember({
              moduleSpecifier: binding.moduleSpecifier,
              path
            })

            return resolvedBarrelBinding(checker)(maximumBarrelDepth)(declaration)(completeBinding)
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

  const importedMemberFromPath =
    (checker: ts.TypeChecker) => (path: readonly [ts.Identifier, ReadonlyArray<string>]) => {
      const root = Tuple.get(path, 0)
      const members = Tuple.get(path, 1)

      return importBindingAt(checker)(members)(root)
    }

  return importedMemberFromPath
}

export const importedMemberFromPath = makeImportedMemberFromPath()
