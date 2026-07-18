import { Array, Function, HashSet, Iterable, Match, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { resolvedSymbolAt } from "./support/tsNode.js"
import { symbolDeclaredInEffectPackage } from "./support/tsSignature.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { astNodesIn } from "@better-typescript/core/engine/sources"

const message = "Avoid unsafe Effect APIs."

const hint =
  "Use the safe Effect API and handle its Effect, Option, Result, or identity semantics " +
  "explicitly. If no safe counterpart preserves the required behavior, redesign the boundary " +
  "instead of using an API whose name contains unsafe."

// EffectApiReference is the value access vocabulary because symbol lookup differs by syntax.
type EffectApiReference = ts.Identifier | ts.PropertyAccessExpression | ts.ElementAccessExpression

const importOrExportNameKinds = HashSet.make(
  ts.SyntaxKind.ImportSpecifier,
  ts.SyntaxKind.ExportSpecifier,
  ts.SyntaxKind.ImportClause,
  ts.SyntaxKind.NamespaceImport,
  ts.SyntaxKind.NamespaceExport
)

const identifierIsAccessName = (identifier: ts.Identifier) =>
  pipe(
    identifier.parent,
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.exists((access) => access.name === identifier)
  )

const identifierIsImportOrExportName = (identifier: ts.Identifier) =>
  HashSet.has(importOrExportNameKinds, identifier.parent.kind)

const identifierMayReferenceRuntimeValue = (identifier: ts.Identifier) =>
  pipe(
    Option.some(identifier),
    Option.filter((candidate) => !identifierIsAccessName(candidate)),
    Option.filter((candidate) => !identifierIsImportOrExportName(candidate)),
    Option.filter((candidate) => !ts.isTypeQueryNode(candidate.parent)),
    Option.isSome
  )

const isEffectApiReference = (node: ts.Node): node is EffectApiReference =>
  pipe(
    Match.value(node),
    Match.when(ts.isPropertyAccessExpression, Function.constTrue),
    Match.when(ts.isElementAccessExpression, Function.constTrue),
    Match.when(ts.isIdentifier, identifierMayReferenceRuntimeValue),
    Match.orElse(Function.constFalse)
  )

const symbolName = Struct.get<ts.Symbol, "name">("name")

const textContainsUnsafe = (name: string) => name.toLowerCase().includes("unsafe")

const nameContainsUnsafe = Function.flow(symbolName, textContainsUnsafe)

const propertyAccessName = Struct.get<ts.PropertyAccessExpression, "name">("name")

const elementAccessArgument = Struct.get<ts.ElementAccessExpression, "argumentExpression">(
  "argumentExpression"
)

const referenceText = (reference: EffectApiReference) => {
  if (ts.isIdentifier(reference)) {
    return reference.text
  }

  if (ts.isPropertyAccessExpression(reference)) {
    return reference.name.text
  }

  const argument = reference.argumentExpression
  return ts.isStringLiteralLike(argument) ? argument.text : ""
}

const unsafeImportedNames = (context: CheckContext) => {
  const resolveSymbol = resolvedSymbolAt(context.checker)

  const importedNames = pipe(
    astNodesIn(context.sourceFile),
    Iterable.filter(ts.isImportSpecifier),
    Iterable.map(Struct.get("name")),
    Array.fromIterable
  )

  return pipe(
    importedNames,
    Array.filter((identifier) =>
      pipe(
        resolveSymbol(identifier),
        Option.filter(nameContainsUnsafe),
        Option.filter(symbolDeclaredInEffectPackage),
        Option.isSome
      )
    ),
    Array.map(Struct.get("text")),
    HashSet.fromIterable
  )
}

const unsafeEffectApiMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const resolveSymbol = resolvedSymbolAt(context.checker)
  const importedNames = unsafeImportedNames(context)

  const matches = (reference: EffectApiReference): ReadonlyArray<Detection> => {
    const name = referenceText(reference)
    const isCandidate = textContainsUnsafe(name) || HashSet.has(importedNames, name)

    if (!isCandidate) {
      return Array.empty()
    }

    return pipe(
      Match.value(reference),
      Match.when(ts.isPropertyAccessExpression, propertyAccessName),
      Match.when(ts.isElementAccessExpression, elementAccessArgument),
      Match.orElse(Function.identity<ts.Identifier>),
      resolveSymbol,
      Option.filter(nameContainsUnsafe),
      Option.filter(symbolDeclaredInEffectPackage),
      Option.map(() => match({ node: reference, message, hint })),
      Option.toArray
    )
  }

  return matches
}

const effectApiReferenceKinds = Array.make(
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression
)

export const noUnsafeEffectApis = makeCheck(
  "no-unsafe-effect-apis",
  effectApiReferenceKinds,
  isEffectApiReference,
  unsafeEffectApiMatches
)
