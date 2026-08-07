import { Array, Function, Match, Option, flow, pipe } from "effect"
import * as ts from "typescript"
import { ImportedMember } from "./importedMember.js"
import { emptyMemberPath } from "./emptyMemberPath.js"
import { moduleDeclarationAncestor } from "./moduleDeclarationAncestor.js"
import { moduleSpecifierText } from "./moduleSpecifierText.js"

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

export const bindingFromDeclaration = (declaration: ts.Declaration) => {
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
