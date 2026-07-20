import { Array, Function, Match, pipe, Option, Struct } from "effect"
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

const isSetIdentifier = (identifier: ts.Identifier) => identifier.text === "Set"

const constructorMessage = "Avoid constructing a built-in Set."

const constructorHint =
  "Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or " +
  "HashSet.empty(). HashSet uses Equal and Hash with structural equality by default. For " +
  "reference-identity object members, wrap each value in an Equal.Equal value that compares " +
  "the underlying objects with === and returns Hash.random(object) from Hash.symbol. " +
  "Constructing a Set is permitted only when it is handed to a third-party API that requires one."

const setTypeNames: ReadonlyArray<string> = Array.make("Set", "ReadonlySet")

const isSetTypeName = (id: ts.Identifier) => Array.contains(setTypeNames, id.text)

const typeRefHint =
  "Use HashSet.HashSet<T> from Effect instead. HashSet uses Equal and Hash with structural " +
  "equality by default. For reference-identity object members, use an Equal.Equal wrapper whose " +
  "equality compares the underlying objects with === and whose Hash.symbol method returns " +
  "Hash.random(object). Writing the built-in Set type is permitted only where it mirrors a " +
  "third-party contract: ambient declarations and values that cross into a third-party call."

const effectModuleName = "effect"

const mutableHashSetModuleName = "effect/MutableHashSet"

const mutableHashSetName = "MutableHashSet"

const mutableHashSetMessage = "Avoid Effect's MutableHashSet."

const mutableHashSetHint =
  "Use Effect's immutable HashSet instead. Build a HashSet with HashSet.empty(), " +
  "HashSet.make(), or HashSet.fromIterable(), and return the value from HashSet.add() " +
  "when updating it."

const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()

const emptyNodes: ReadonlyArray<ts.Node> = Array.empty()

const typeNameIdentifier = Function.flow(
  Struct.get<ts.TypeReferenceNode, "typeName">("typeName"),
  Option.liftPredicate(ts.isIdentifier)
)

const isSetRuleNode = (node: ts.Node): node is NewOrTypeReferenceNode =>
  ts.isNewExpression(node) ||
  pipe(
    Option.liftPredicate(ts.isTypeReferenceNode)(node),
    Option.flatMap(typeNameIdentifier),
    Option.exists(isSetTypeName)
  )

const setMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const constructionEscapes = constructionEscapesExternally(context.checker)
  const typeRefEscapes = typeReferenceEscapesExternally(context.checker)

  const matches = (node: ts.Node): ReadonlyArray<Detection> => {
    if (!isSetRuleNode(node)) {
      return Array.empty()
    }

    if (ts.isNewExpression(node)) {
      const expressionOption = Option.liftPredicate(ts.isIdentifier)(node.expression)
      const isSetConstruction = Option.exists(expressionOption, isSetIdentifier)
      const escapesExternally = isSetConstruction && constructionEscapes(node)
      const reportableConditions = Array.make(isSetConstruction, !escapesExternally)
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

const mutableHashSetImportMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const matches = (declaration: ts.ImportDeclaration): ReadonlyArray<Detection> => {
    const isMutableHashSetModule = (moduleName: string) => moduleName === mutableHashSetModuleName
    const isEffectModule = (moduleName: string) => moduleName === effectModuleName

    const mutableHashSetSpecifier = (specifier: ts.ImportSpecifier) =>
      (specifier.propertyName?.text ?? specifier.name.text) === mutableHashSetName

    const mutableHashSetBindings = (bindings: ts.NamedImports): ReadonlyArray<ts.Node> =>
      Array.filter(bindings.elements, mutableHashSetSpecifier)

    const effectNamedImportNodes = () =>
      pipe(
        Option.fromNullishOr(declaration.importClause?.namedBindings),
        Option.filter(ts.isNamedImports),
        Option.map(mutableHashSetBindings),
        Option.getOrElse(Function.constant(emptyNodes))
      )

    const nodesForModuleSpecifier = (moduleSpecifier: ts.StringLiteralLike) =>
      pipe(
        Match.value(moduleSpecifier.text),
        Match.when(isMutableHashSetModule, () => Array.of<ts.Node>(moduleSpecifier)),
        Match.when(isEffectModule, effectNamedImportNodes),
        Match.orElse(Function.constant(emptyNodes))
      )

    const importNodes = pipe(
      Option.liftPredicate(ts.isStringLiteralLike)(declaration.moduleSpecifier),
      Option.map(nodesForModuleSpecifier),
      Option.getOrElse(Function.constant(emptyNodes))
    )

    const mutableHashSetDetection = (node: ts.Node) =>
      match({
        node,
        message: mutableHashSetMessage,
        hint: mutableHashSetHint
      })

    return Array.map(importNodes, mutableHashSetDetection)
  }

  return matches
}

const isMutableHashSetAccess = (access: ts.PropertyAccessExpression) =>
  access.name.text === mutableHashSetName

const isMutableHashSetNamespaceAccess = (node: ts.Node): node is ts.PropertyAccessExpression =>
  pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(node),
    Option.exists(isMutableHashSetAccess)
  )

const mutableHashSetNamespaceMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const matches = (access: ts.PropertyAccessExpression): ReadonlyArray<Detection> => {
    const symbolAtIdentifier = (identifier: ts.Identifier) =>
      pipe(context.checker.getSymbolAtLocation(identifier), Option.fromNullishOr)

    const isEffectModuleSpecifier = (moduleSpecifier: ts.StringLiteralLike) =>
      moduleSpecifier.text === effectModuleName

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
      message: mutableHashSetMessage,
      hint: mutableHashSetHint
    })

    return Array.of(namespaceMatch)
  }

  return matches
}

const setRuleNodeKinds = Array.make(ts.SyntaxKind.NewExpression, ts.SyntaxKind.TypeReference)

const setRuleSubscriptions = nodeSubscriptions(setRuleNodeKinds)(isSetRuleNode)(setMatches)

const importDeclarationKinds = Array.of(ts.SyntaxKind.ImportDeclaration)

const mutableHashSetImportSubscriptions = nodeSubscriptions(importDeclarationKinds)(
  ts.isImportDeclaration
)(mutableHashSetImportMatches)

const propertyAccessKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)

const mutableHashSetNamespaceSubscriptions = nodeSubscriptions(propertyAccessKinds)(
  isMutableHashSetNamespaceAccess
)(mutableHashSetNamespaceMatches)

const preferHashSetSubscriptions = Array.make(
  setRuleSubscriptions,
  mutableHashSetImportSubscriptions,
  mutableHashSetNamespaceSubscriptions
)

const preferHashSetListeners = Array.flatten(preferHashSetSubscriptions)

export const preferHashSet = makePlannedCheck(
  "prefer-hash-set",
  Function.constant(preferHashSetListeners)
)
