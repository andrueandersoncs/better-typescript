import { Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { importDeclarationAncestor } from "./importDeclarationAncestor.js"
import { rootIdentifier } from "./rootIdentifier.js"
import { rawSymbolAt } from "../support/rawSymbolAt.js"

const hasImportDeclarationAncestor = Function.compose(importDeclarationAncestor, Option.isSome)

export const importedModuleSpecifier = (checker: ts.TypeChecker, expression: ts.Expression) =>
  pipe(
    rootIdentifier(expression),
    Option.flatMap(rawSymbolAt(checker)),
    Option.map((symbol) => symbol.declarations ?? Array.empty()),
    Option.flatMap(Array.findFirst(hasImportDeclarationAncestor)),
    Option.flatMap(importDeclarationAncestor),
    Option.map(Struct.get("moduleSpecifier")),
    Option.filter(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )
