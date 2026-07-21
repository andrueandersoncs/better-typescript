import { Array, Function, Match, Option, pipe, Struct, flow } from "effect"
import * as ts from "typescript"
import { makeMatcherFromSubscriptions, nodeSubscriptions } from "../matcher/matcher.js"
import { nodeMatch, type Match as MatcherMatch, type MatchContext } from "../matcher/data.js"
import {
  constructionEscapesExternally,
  typeReferenceEscapesExternally
} from "../support/tsSignature.js"
import { isInAmbientContext, type NewOrTypeReferenceNode } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()
const emptyNodes: ReadonlyArray<ts.Node> = Array.empty()
const effectModuleName = "effect"

const typeNameIdentifier = Function.flow(
  Struct.get<ts.TypeReferenceNode, "typeName">("typeName"),
  Option.liftPredicate(ts.isIdentifier)
)

const ruleNodeKinds = Array.make(ts.SyntaxKind.NewExpression, ts.SyntaxKind.TypeReference)
const importDeclarationKinds = Array.of(ts.SyntaxKind.ImportDeclaration)
const propertyAccessKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)

// constructorMatches reports built-in collection construction because Map/Set share one seam.
export const constructorMatches =
  <Fact>(
    isCollectionIdentifier: (identifier: ts.Identifier) => boolean,
    makeConstructorFact: () => Fact
  ) =>
  (
    node: ts.NewExpression,
    constructionEscapes: (expression: ts.NewExpression) => boolean
  ): ReadonlyArray<MatcherMatch<Fact>> => {
    const expressionOption = Option.liftPredicate(ts.isIdentifier)(node.expression)
    const isCollectionConstruction = Option.exists(expressionOption, isCollectionIdentifier)
    const escapesExternally = isCollectionConstruction && constructionEscapes(node)
    const reportableConditions = Array.make(isCollectionConstruction, !escapesExternally)
    const isReportable = Array.every(reportableConditions, Boolean)

    if (!isReportable) {
      return Array.empty()
    }

    const constructorFact = makeConstructorFact()
    const constructorMatchValue = nodeMatch(node, constructorFact)

    return Array.of(constructorMatchValue)
  }

// typeRefMatches reports built-in collection type refs because Map/Set share one seam.
export const typeRefMatches =
  <Fact>(makeTypeRefFact: (typeName: string) => Fact) =>
  (
    node: ts.TypeReferenceNode,
    typeRefEscapes: (reference: ts.TypeReferenceNode) => boolean
  ): ReadonlyArray<MatcherMatch<Fact>> => {
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

    const typeRefFact = makeTypeRefFact(name)
    const typeRefMatchValue = nodeMatch(node, typeRefFact)

    return Array.of(typeRefMatchValue)
  }

// HashCollectionNames parameterizes Map/Set identity because both share one orchestration.
export interface HashCollectionNames {
  readonly collectionName: string
  readonly typeNames: ReadonlyArray<string>
  readonly mutableModuleName: string
  readonly mutableName: string
}

const isCollectionRuleNode =
  (isTypeName: (id: ts.Identifier) => boolean) =>
  (node: ts.Node): node is NewOrTypeReferenceNode =>
    ts.isNewExpression(node) ||
    pipe(
      Option.liftPredicate(ts.isTypeReferenceNode)(node),
      Option.flatMap(typeNameIdentifier),
      Option.exists(isTypeName)
    )

const collectionNodeMatches =
  <Fact>(
    collectionConstructorMatches: (
      node: ts.NewExpression,
      constructionEscapes: (expression: ts.NewExpression) => boolean
    ) => ReadonlyArray<MatcherMatch<Fact>>,
    collectionTypeRefMatches: (
      node: ts.TypeReferenceNode,
      typeRefEscapes: (reference: ts.TypeReferenceNode) => boolean
    ) => ReadonlyArray<MatcherMatch<Fact>>
  ) =>
  (context: MatchContext) =>
  (node: NewOrTypeReferenceNode): ReadonlyArray<MatcherMatch<Fact>> => {
    const constructionEscapes = constructionEscapesExternally(context.checker)
    const typeRefEscapes = typeReferenceEscapesExternally(context.checker)

    return ts.isNewExpression(node)
      ? collectionConstructorMatches(node, constructionEscapes)
      : collectionTypeRefMatches(node, typeRefEscapes)
  }

const mutableImportMatches =
  <Fact>(mutableModuleName: string, mutableName: string, makeMutableFact: () => Fact) =>
  () =>
  (declaration: ts.ImportDeclaration) => {
    const isMutableModule = strictEqual(mutableModuleName)
    const isEffectModule = strictEqual(effectModuleName)

    const mutableSpecifier = (specifier: ts.ImportSpecifier) =>
      strictEqual(mutableName)(specifier.propertyName?.text ?? specifier.name.text)

    const mutableBindings = (bindings: ts.NamedImports): ReadonlyArray<ts.Node> =>
      Array.filter(bindings.elements, mutableSpecifier)

    const effectNamedImportNodes = () =>
      pipe(
        Option.fromNullishOr(declaration.importClause?.namedBindings),
        Option.filter(ts.isNamedImports),
        Option.map(mutableBindings),
        Option.getOrElse(Function.constant(emptyNodes))
      )

    const nodesForModuleSpecifier = (moduleSpecifier: ts.StringLiteralLike) =>
      pipe(
        Match.value(moduleSpecifier.text),
        Match.when(isMutableModule, () => Array.of<ts.Node>(moduleSpecifier)),
        Match.when(isEffectModule, effectNamedImportNodes),
        Match.orElse(Function.constant(emptyNodes))
      )

    const importNodes = pipe(
      Option.liftPredicate(ts.isStringLiteralLike)(declaration.moduleSpecifier),
      Option.map(nodesForModuleSpecifier),
      Option.getOrElse(Function.constant(emptyNodes))
    )

    const mutableFact = makeMutableFact()
    const toMutableMatch = (node: ts.Node) => nodeMatch(node, mutableFact)

    return Array.map(importNodes, toMutableMatch)
  }

const isMutableNamespaceAccess =
  (mutableName: string) =>
  (node: ts.Node): node is ts.PropertyAccessExpression => {
    const isMutableAccess = (access: ts.PropertyAccessExpression) =>
      strictEqual(mutableName)(access.name.text)

    return pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(node),
      Option.exists(isMutableAccess)
    )
  }

const mutableNamespaceMatches =
  <Fact>(makeMutableFact: () => Fact) =>
  (context: MatchContext) =>
  (access: ts.PropertyAccessExpression) => {
    const emptyMatches: ReadonlyArray<MatcherMatch<Fact>> = Array.empty()

    const symbolAtIdentifier = (identifier: ts.Identifier) =>
      pipe(context.checker.getSymbolAtLocation(identifier), Option.fromNullishOr)

    const isEffectModuleSpecifier = flow(
      Struct.get<ts.StringLiteralLike, "text">("text"),
      strictEqual(effectModuleName)
    )

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
      return emptyMatches
    }

    const mutableAccessFact = makeMutableFact()
    const mutableAccessMatch = nodeMatch(access.name, mutableAccessFact)

    return Array.of(mutableAccessMatch)
  }

// makeHashCollectionMatcher builds Map/Set matchers because both share the same seams.
export const makeHashCollectionMatcher = <Fact>(
  names: HashCollectionNames,
  makeConstructorFact: () => Fact,
  makeTypeRefFact: (typeName: string) => Fact,
  makeMutableFact: () => Fact
) => {
  const isCollectionIdentifier = flow(
    Struct.get<ts.Identifier, "text">("text"),
    strictEqual(names.collectionName)
  )

  const isTypeName = (id: ts.Identifier) => Array.contains(names.typeNames, id.text)
  const isRuleNode = isCollectionRuleNode(isTypeName)

  const collectionConstructorMatches = constructorMatches(
    isCollectionIdentifier,
    makeConstructorFact
  )

  const collectionTypeRefMatches = typeRefMatches(makeTypeRefFact)
  const nodeMatches = collectionNodeMatches(collectionConstructorMatches, collectionTypeRefMatches)
  const ruleSubscriptions = nodeSubscriptions(ruleNodeKinds)(isRuleNode)(nodeMatches)

  const importMatches = mutableImportMatches(
    names.mutableModuleName,
    names.mutableName,
    makeMutableFact
  )

  const importSubscriptions = nodeSubscriptions(importDeclarationKinds)(ts.isImportDeclaration)(
    importMatches
  )

  const namespaceAccess = isMutableNamespaceAccess(names.mutableName)
  const namespaceMatches = mutableNamespaceMatches(makeMutableFact)

  const namespaceSubscriptions =
    nodeSubscriptions(propertyAccessKinds)(namespaceAccess)(namespaceMatches)

  const subscriptionGroups = Array.make(
    ruleSubscriptions,
    importSubscriptions,
    namespaceSubscriptions
  )

  const listeners = Array.flatten(subscriptionGroups)

  return makeMatcherFromSubscriptions(Function.constant(listeners))
}

// Prefer matchers keep constant facts local because only their collection names vary.
export const makeHashCollectionPreferMatcher = <Fact>(
  names: HashCollectionNames,
  constructorFact: Fact,
  makeTypeRefFact: (typeName: string) => Fact,
  mutableFact: Fact
) => {
  const makeConstructorFact = Function.constant(constructorFact)
  const makeMutableFact = Function.constant(mutableFact)

  return makeHashCollectionMatcher(names, makeConstructorFact, makeTypeRefFact, makeMutableFact)
}
