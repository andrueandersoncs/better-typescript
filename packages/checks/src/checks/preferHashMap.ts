import { Array, Function, Match, pipe, Option, Struct } from "effect"
import * as ts from "typescript"
import { isInAmbientContext, type NewOrTypeReferenceNode } from "./support/tsNode.js"
import {
  constructionEscapesExternally,
  typeReferenceEscapesExternally
} from "./support/tsSignature.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { definePlannedCheck } from "../defineCheck.js"
import { nodeSubscriptions, detection } from "@better-typescript/core/engine/check"

const isMapIdentifier = (identifier: ts.Identifier) => identifier.text === "Map"

const constructorMessage = "Avoid constructing a built-in Map."

const constructorHint =
  'Use Effect\'s HashMap instead — for example HashMap.fromIterable([["a", 1]]) or ' +
  "HashMap.empty(). HashMap uses Equal and Hash with structural equality by default; " +
  "for reference-identity object keys (for example TypeScript checker symbols), wrap " +
  "keys with Equal.byReferenceUnsafe at the creation boundary. Constructing a Map is " +
  "permitted only when it is handed to a third-party API that requires one."

const mapTypeNames: ReadonlyArray<string> = Array.make("Map", "ReadonlyMap")

const isMapTypeName = (id: ts.Identifier) => Array.contains(mapTypeNames, id.text)

const typeRefHint =
  "Use HashMap.HashMap<K, V> from Effect instead. HashMap uses Equal and Hash with " +
  "structural equality by default; wrap reference-identity object keys with " +
  "Equal.byReferenceUnsafe at the creation boundary. Writing the built-in Map type is " +
  "permitted only where it mirrors a third-party contract: ambient declarations and " +
  "values that cross into a third-party call."

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

const isMapRuleNode = (node: ts.Node): node is NewOrTypeReferenceNode =>
  ts.isNewExpression(node) ||
  pipe(
    Option.liftPredicate(ts.isTypeReferenceNode)(node),
    Option.flatMap((ref) => Option.liftPredicate(ts.isIdentifier)(ref.typeName)),
    Option.exists(isMapTypeName)
  )

const mapMatches = (context: CheckContext) => {
  const match = detection(context)
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
  const match = detection(context)

  const matches = (declaration: ts.ImportDeclaration): ReadonlyArray<Detection> => {
    const importNodes = pipe(
      Option.liftPredicate(ts.isStringLiteralLike)(declaration.moduleSpecifier),
      Option.map((moduleSpecifier) =>
        pipe(
          Match.value(moduleSpecifier.text),
          Match.when(
            (moduleName) => moduleName === mutableHashMapModuleName,
            () => Array.of<ts.Node>(moduleSpecifier)
          ),
          Match.when(
            (moduleName) => moduleName === effectModuleName,
            () =>
              pipe(
                Option.fromNullishOr(declaration.importClause?.namedBindings),
                Option.filter(ts.isNamedImports),
                Option.map((bindings): ReadonlyArray<ts.Node> =>
                  Array.filter(
                    bindings.elements,
                    (specifier) =>
                      (specifier.propertyName?.text ?? specifier.name.text) === mutableHashMapName
                  )
                ),
                Option.getOrElse(Function.constant(emptyNodes))
              )
          ),
          Match.orElse(Function.constant(emptyNodes))
        )
      ),
      Option.getOrElse(Function.constant(emptyNodes))
    )

    return Array.map(importNodes, (node) =>
      match({
        node,
        message: mutableHashMapMessage,
        hint: mutableHashMapHint
      })
    )
  }

  return matches
}

const isMutableHashMapNamespaceAccess = (node: ts.Node): node is ts.PropertyAccessExpression =>
  pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(node),
    Option.exists((access) => access.name.text === mutableHashMapName)
  )

const mutableHashMapNamespaceMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (access: ts.PropertyAccessExpression): ReadonlyArray<Detection> => {
    const isEffectNamespace = pipe(
      Option.liftPredicate(ts.isIdentifier)(access.expression),
      Option.flatMap((identifier) =>
        pipe(context.checker.getSymbolAtLocation(identifier), Option.fromNullishOr)
      ),
      Option.exists((symbol) =>
        Array.some(symbol.declarations ?? emptyDeclarations, (declaration) =>
          pipe(
            Option.liftPredicate(ts.isNamespaceImport)(declaration),
            Option.map((namespaceImport) => namespaceImport.parent.parent),
            Option.filter(ts.isImportDeclaration),
            Option.map(Struct.get("moduleSpecifier")),
            Option.filter(ts.isStringLiteralLike),
            Option.exists((moduleSpecifier) => moduleSpecifier.text === effectModuleName)
          )
        )
      )
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

export const preferHashMap = definePlannedCheck(
  "prefer-hash-map",
  Function.constant(preferHashMapListeners)
)
