import {
  Array,
  Function,
  HashSet,
  Iterable,
  Match,
  Option,
  pipe,
  Predicate,
  Struct,
  flow,
  Schema
} from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import { resolvedSymbolAt } from "../support/tsNode.js"
import { symbolDeclaredInEffectPackage } from "../support/tsSignature.js"
import { astNodesIn } from "../sources/sources.js"
import { strictEqual } from "../equivalence.js"

// NoUnsafeEffectApisFact is empty payload because guidance and matchers share identity.
export const NoUnsafeEffectApisFact = Schema.Struct({})

export interface NoUnsafeEffectApisFact extends Schema.Schema.Type<typeof NoUnsafeEffectApisFact> {}

// emptyNoUnsafeEffectApisFact is empty payload because guidance and matchers share identity.
export const emptyNoUnsafeEffectApisFact = NoUnsafeEffectApisFact.make({})

// EffectApiReference is a local syntax union because matchers need one narrowed node shape.
type EffectApiReference = ts.Identifier | ts.PropertyAccessExpression | ts.ElementAccessExpression

const importOrExportNameKinds = HashSet.make(
  ts.SyntaxKind.ImportSpecifier,
  ts.SyntaxKind.ExportSpecifier,
  ts.SyntaxKind.ImportClause,
  ts.SyntaxKind.NamespaceImport,
  ts.SyntaxKind.NamespaceExport
)

const identifierIsAccessName = (identifier: ts.Identifier) => {
  const accessNameIsIdentifier = flow(
    Struct.get<ts.PropertyAccessExpression, "name">("name"),
    strictEqual(identifier)
  )

  return pipe(
    identifier.parent,
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.exists(accessNameIsIdentifier)
  )
}

const identifierIsImportOrExportName = (identifier: ts.Identifier) =>
  HashSet.has(importOrExportNameKinds, identifier.parent.kind)

const identifierIsTypeQueryName = (identifier: ts.Identifier) =>
  ts.isTypeQueryNode(identifier.parent)

const identifierMayReferenceRuntimeValue = (identifier: ts.Identifier) =>
  pipe(
    Option.some(identifier),
    Option.filter(Predicate.not(identifierIsAccessName)),
    Option.filter(Predicate.not(identifierIsImportOrExportName)),
    Option.filter(Predicate.not(identifierIsTypeQueryName)),
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

const unsafeImportedNames = (context: MatchContext) => {
  const resolveSymbol = resolvedSymbolAt(context.checker)

  const importedNames = pipe(
    astNodesIn(context.sourceFile),
    Iterable.filter(ts.isImportSpecifier),
    Iterable.map(Struct.get("name")),
    Array.fromIterable
  )

  const importIsUnsafeEffectApi = (identifier: ts.Identifier) =>
    pipe(
      resolveSymbol(identifier),
      Option.filter(nameContainsUnsafe),
      Option.filter(symbolDeclaredInEffectPackage),
      Option.isSome
    )

  return pipe(
    importedNames,
    Array.filter(importIsUnsafeEffectApi),
    Array.map(Struct.get("text")),
    HashSet.fromIterable
  )
}

const unsafeEffectApiMatches = (context: MatchContext) => {
  const resolveSymbol = resolvedSymbolAt(context.checker)
  const importedNames = unsafeImportedNames(context)

  const matches = (reference: EffectApiReference) => {
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
      Option.map(() => {
        const match = makeNodeMatch(reference, emptyNoUnsafeEffectApisFact)

        return match
      }),
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

export const noUnsafeEffectApisMatcher =
  nodeMatcher(effectApiReferenceKinds)(isEffectApiReference)(unsafeEffectApiMatches)
