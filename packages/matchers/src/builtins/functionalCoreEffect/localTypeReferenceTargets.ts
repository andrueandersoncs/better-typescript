import { Array, Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import { isProjectFile } from "../../support/isProjectFile.js"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"
import { emptyTypeReferences } from "./emptyTypeReferences.js"
import { typeReferencesWithin } from "./typeReferencesWithin.js"

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
