import { Array, Function, Match, Option, pipe, Struct } from "effect"
import * as ts from "typescript"
import { isInAmbientContext, type NewOrTypeReferenceNode } from "./support/tsNode.js"
import {
  constructionEscapesExternally,
  typeReferenceEscapesExternally
} from "./support/tsSignature.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makePlannedCheck } from "../defineCheck.js"
import { nodeSubscriptions, makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const isMapIdentifier = (identifier: ts.Identifier) => strictEqual(identifier.text, "Map")

const constructorMessage = "Avoid constructing a built-in Map."

const constructorHint =
  'Use Effect\'s HashMap instead — for example HashMap.fromIterable([["a", 1]]) or ' +
  "HashMap.empty(). HashMap uses Equal and Hash with structural equality by default. For " +
  "reference-identity object keys, wrap each key in an Equal.Equal value that compares the " +
  "underlying objects with === and returns Hash.random(object) from Hash.symbol. Constructing " +
  "a Map is permitted only when it is handed to a third-party API that requires one."

const mapTypeNames: ReadonlyArray<string> = Array.make("Map", "ReadonlyMap")

const isMapTypeName = (id: ts.Identifier) => Array.contains(mapTypeNames, id.text)

const typeRefHint =
  "Use HashMap.HashMap<K, V> from Effect instead. HashMap uses Equal and Hash with structural " +
  "equality by default. For reference-identity object keys, use an Equal.Equal wrapper whose " +
  "equality compares the underlying objects with === and whose Hash.symbol method returns " +
  "Hash.random(object). Writing the built-in Map type is permitted only where it mirrors a " +
  "third-party contract: ambient declarations and values that cross into a third-party call."

const effectModuleName = "effect"

const mutableHashMapModuleName = "effect/MutableHashMap"

const mutableHashMapName = "MutableHashMap"

const mutableHashMapMessage = "Avoid Effect's MutableHashMap."

const mutableHashMapHint =
  "Use Effect's immutable HashMap instead. Build a HashMap with HashMap.empty(), " +
  "HashMap.make(), or HashMap.fromIterable(), and return the value from HashMap.set() " +
  "when updating it."

const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()

const emptyNodes: ReadonlyArray<ts.Node> = Array.empty()

const typeNameIdentifier = Function.flow(
  Struct.get<ts.TypeReferenceNode, "typeName">("typeName"),
  Option.liftPredicate(ts.isIdentifier)
)

const isMapRuleNode = (node: ts.Node): node is NewOrTypeReferenceNode =>
  ts.isNewExpression(node) ||
  pipe(
    Option.liftPredicate(ts.isTypeReferenceNode)(node),
    Option.flatMap(typeNameIdentifier),
    Option.exists(isMapTypeName)
  )

const mapMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const constructionEscapes = constructionEscapesExternally(context.checker)
  const typeRefEscapes = typeReferenceEscapesExternally(context.checker)

  const matches = (node: ts.Node): ReadonlyArray<Detection> => {
    if (!isMapRuleNode(node)) {
      return Array.empty()
    }

    if (ts.isNewExpression(node)) {
      const expressionOption = Option.liftPredicate(ts.isIdentifier)(node.expression)
      const isMapConstruction = Option.exists(expressionOption, isMapIdentifier)
      const escapesExternally = isMapConstruction && constructionEscapes(node)
      const reportableConditions = Array.make(isMapConstruction, !escapesExternally)
      const isReportable = Array.every(reportableConditions, Boolean)

      const constructorMatch = match({
        node,
        message: constructorMessage,
        hint: constructorHint
      })

      return isReportable ? Array.of(constructorMatch) : Array.empty()
    }

    const isAmbient = isInAmbientContext(node)
    const escapesExternally = typeRefEscapes(node)
    const isBoundaryMirror = isAmbient || escapesExternally

    if (isBoundaryMirror) {
      return Array.empty()
    }

    const name = pipe(
      Option.liftPredicate(ts.isIdentifier)(node.typeName),
      Option.map(Struct.get("text")),
      Option.getOrElse(Function.constant(""))
    )

    const message = `Avoid the built-in ${name} type.`

    const typeRefMatch = match({
      node,
      message,
      hint: typeRefHint
    })

    return Array.of(typeRefMatch)
  }

  return matches
}

const mutableHashMapImportMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const matches = (declaration: ts.ImportDeclaration): ReadonlyArray<Detection> => {
    const isMutableHashMapModule = (moduleName: string) =>
      strictEqual(moduleName, mutableHashMapModuleName)

    const isEffectModule = (moduleName: string) => strictEqual(moduleName, effectModuleName)

    const mutableHashMapSpecifier = (specifier: ts.ImportSpecifier) =>
      strictEqual(specifier.propertyName?.text ?? specifier.name.text, mutableHashMapName)

    const mutableHashMapBindings = (bindings: ts.NamedImports): ReadonlyArray<ts.Node> =>
      Array.filter(bindings.elements, mutableHashMapSpecifier)

    const effectNamedImportNodes = () =>
      pipe(
        Option.fromNullishOr(declaration.importClause?.namedBindings),
        Option.filter(ts.isNamedImports),
        Option.map(mutableHashMapBindings),
        Option.getOrElse(Function.constant(emptyNodes))
      )

    const nodesForModuleSpecifier = (moduleSpecifier: ts.StringLiteralLike) =>
      pipe(
        Match.value(moduleSpecifier.text),
        Match.when(isMutableHashMapModule, () => Array.of<ts.Node>(moduleSpecifier)),
        Match.when(isEffectModule, effectNamedImportNodes),
        Match.orElse(Function.constant(emptyNodes))
      )

    const importNodes = pipe(
      Option.liftPredicate(ts.isStringLiteralLike)(declaration.moduleSpecifier),
      Option.map(nodesForModuleSpecifier),
      Option.getOrElse(Function.constant(emptyNodes))
    )

    const mutableHashMapDetection = (node: ts.Node) =>
      match({
        node,
        message: mutableHashMapMessage,
        hint: mutableHashMapHint
      })

    return Array.map(importNodes, mutableHashMapDetection)
  }

  return matches
}

const isMutableHashMapAccess = (access: ts.PropertyAccessExpression) =>
  strictEqual(access.name.text, mutableHashMapName)

const isMutableHashMapNamespaceAccess = (node: ts.Node): node is ts.PropertyAccessExpression =>
  pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(node),
    Option.exists(isMutableHashMapAccess)
  )

const mutableHashMapNamespaceMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const matches = (access: ts.PropertyAccessExpression): ReadonlyArray<Detection> => {
    const symbolAtIdentifier = (identifier: ts.Identifier) =>
      pipe(context.checker.getSymbolAtLocation(identifier), Option.fromNullishOr)

    const isEffectModuleSpecifier = (moduleSpecifier: ts.StringLiteralLike) =>
      strictEqual(moduleSpecifier.text, effectModuleName)

    const namespaceImportFromEffect = (declaration: ts.Declaration) =>
      pipe(
        Option.liftPredicate(ts.isNamespaceImport)(declaration),
        Option.map((namespaceImport) => namespaceImport.parent.parent),
        Option.filter(ts.isImportDeclaration),
        Option.map(Struct.get("moduleSpecifier")),
        Option.filter(ts.isStringLiteralLike),
        Option.exists(isEffectModuleSpecifier)
      )

    const symbolIsEffectNamespace = (symbol: ts.Symbol) =>
      Array.some(symbol.declarations ?? emptyDeclarations, namespaceImportFromEffect)

    const isEffectNamespace = pipe(
      Option.liftPredicate(ts.isIdentifier)(access.expression),
      Option.flatMap(symbolAtIdentifier),
      Option.exists(symbolIsEffectNamespace)
    )

    if (!isEffectNamespace) {
      return Array.empty()
    }

    const namespaceMatch = match({
      node: access.name,
      message: mutableHashMapMessage,
      hint: mutableHashMapHint
    })

    return Array.of(namespaceMatch)
  }

  return matches
}

const mapRuleNodeKinds = Array.make(ts.SyntaxKind.NewExpression, ts.SyntaxKind.TypeReference)

const mapRuleSubscriptions = nodeSubscriptions(mapRuleNodeKinds)(isMapRuleNode)(mapMatches)

const importDeclarationKinds = Array.of(ts.SyntaxKind.ImportDeclaration)

const mutableHashMapImportSubscriptions = nodeSubscriptions(importDeclarationKinds)(
  ts.isImportDeclaration
)(mutableHashMapImportMatches)

const propertyAccessKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)

const mutableHashMapNamespaceSubscriptions = nodeSubscriptions(propertyAccessKinds)(
  isMutableHashMapNamespaceAccess
)(mutableHashMapNamespaceMatches)

const preferHashMapSubscriptions = Array.make(
  mapRuleSubscriptions,
  mutableHashMapImportSubscriptions,
  mutableHashMapNamespaceSubscriptions
)

const preferHashMapListeners = Array.flatten(preferHashMapSubscriptions)

export const preferHashMap = makePlannedCheck(
  "prefer-hash-map",
  Function.constant(preferHashMapListeners)
)
