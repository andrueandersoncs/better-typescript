import { emptyDeclarations } from "../support/emptyDeclarations.js"
import { propertyAccessKinds } from "../scanner/nodeKindSubscriptions.js"
import { Array, Function, Option, Struct, flow, pipe, Match as EffectMatch } from "effect"
import * as ts from "typescript"
import { Scanner } from "../scanner/scannerData.js"
import { nodeSubscriptions } from "../scanner/nodeSubscriptions.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { Match as ScannerMatch } from "../scanner/match.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { outermostTransparentWrapper } from "../support/outermostTransparentWrapper.js"
import { nameNodeEscapes } from "../support/nameNodeEscapes.js"
import { isExternalArgumentPosition } from "../support/isExternalArgumentPosition.js"
import { functionDeclarationName } from "../support/functionDeclarationName.js"
import type { EscapeCarrier } from "../support/escapeCarrierType.js"
import { isInAmbientContext } from "../support/isDeclareKeyword.js"
import type { NewOrTypeReferenceNode } from "../support/newOrTypeReferenceNode.js"
import { strictEqual } from "../equivalence.js"
import { effectModuleName } from "./effectModuleName.js"
import type { HashCollectionNames } from "./hashCollectionNames.js"

// A construction escapes because an external signature receives it directly or through a variable.
const constructionEscapesExternally = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const outermost = outermostTransparentWrapper(expression)
  const isDirectExternalArgument = isExternalArgumentPosition(checker)(outermost)
  const sourceFile = expression.getSourceFile()

  const escapesThroughVariable = pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(outermost.parent),
    Option.filter((declaration) => {
      const initializerIsOutermost = strictEqual(outermost)(declaration.initializer)

      return initializerIsOutermost
    }),
    Option.map(Struct.get("name")),
    Option.exists(nameNodeEscapes(checker)(sourceFile))
  )

  return isDirectExternalArgument || escapesThroughVariable
}

const isEscapeCarrierNode = (node: ts.Node): node is EscapeCarrier =>
  ts.isVariableDeclaration(node) || ts.isParameter(node)

const escapeCarrier = (node: ts.Node): Option.Option<EscapeCarrier> => {
  if (ts.isSourceFile(node.parent)) {
    return Option.none()
  }

  const carrier = Option.liftPredicate(isEscapeCarrierNode)(node.parent)

  return pipe(
    carrier,
    Option.orElse(() => escapeCarrier(node.parent))
  )
}

// A written Map or Set type escapes because its carrier crosses an external boundary.
const typeReferenceEscapesExternally =
  (checker: ts.TypeChecker) => (typeRef: ts.TypeReferenceNode) =>
    pipe(
      escapeCarrier(typeRef),
      Option.exists((carrier) => {
        if (ts.isParameter(carrier)) {
          const sourceFile = carrier.getSourceFile()
          const isDirectExternalArgument = isExternalArgumentPosition(checker)(carrier.parent)

          const variableName = pipe(
            Option.liftPredicate(ts.isVariableDeclaration)(carrier.parent.parent),
            Option.map(Struct.get("name"))
          )

          const functionName = pipe(
            Option.liftPredicate(ts.isFunctionDeclaration)(carrier.parent),
            Option.flatMap(functionDeclarationName)
          )

          const nameNode = pipe(variableName, Option.orElse(Function.constant(functionName)))
          const escapesThroughName = Option.exists(nameNode, nameNodeEscapes(checker)(sourceFile))

          return isDirectExternalArgument || escapesThroughName
        }

        const sourceFile = carrier.getSourceFile()

        return nameNodeEscapes(checker)(sourceFile)(carrier.name)
      })
    )

const emptyNodes: ReadonlyArray<ts.Node> = Array.empty()

const typeNameIdentifier = Function.flow(
  Struct.get<ts.TypeReferenceNode, "typeName">("typeName"),
  Option.liftPredicate(ts.isIdentifier)
)

const ruleNodeKinds = Array.make(ts.SyntaxKind.NewExpression, ts.SyntaxKind.TypeReference)
const importDeclarationKinds = Array.of(ts.SyntaxKind.ImportDeclaration)

// constructorMatches reports built-in collection construction because Map/Set share one seam.
export const constructorMatches =
  <Fact>(isCollectionIdentifier: (identifier: ts.Identifier) => boolean) =>
  (makeConstructorFact: () => Fact) =>
  (constructionEscapes: (expression: ts.NewExpression) => boolean) =>
  (node: ts.NewExpression): ReadonlyArray<ScannerMatch<Fact>> => {
    const expressionOption = Option.liftPredicate(ts.isIdentifier)(node.expression)
    const isCollectionConstruction = Option.exists(expressionOption, isCollectionIdentifier)
    const escapesExternally = isCollectionConstruction && constructionEscapes(node)
    const reportableConditions = Array.make(isCollectionConstruction, !escapesExternally)
    const isReportable = Array.every(reportableConditions, Boolean)

    if (!isReportable) {
      return Array.empty()
    }

    const constructorFact = makeConstructorFact()
    const constructorMatchValue = makeNodeMatch(node, constructorFact)

    return Array.of(constructorMatchValue)
  }

// typeRefMatches reports built-in collection type refs because Map/Set share one seam.
export const typeRefMatches =
  <Fact>(makeTypeRefFact: (typeName: string) => Fact) =>
  (typeRefEscapes: (reference: ts.TypeReferenceNode) => boolean) =>
  (node: ts.TypeReferenceNode): ReadonlyArray<ScannerMatch<Fact>> => {
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
    const typeRefMatchValue = makeNodeMatch(node, typeRefFact)

    return Array.of(typeRefMatchValue)
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
      constructionEscapes: (expression: ts.NewExpression) => boolean
    ) => (node: ts.NewExpression) => ReadonlyArray<ScannerMatch<Fact>>
  ) =>
  (
    collectionTypeRefMatches: (
      typeRefEscapes: (reference: ts.TypeReferenceNode) => boolean
    ) => (node: ts.TypeReferenceNode) => ReadonlyArray<ScannerMatch<Fact>>
  ) =>
  (context: MatchContext) =>
  (node: NewOrTypeReferenceNode): ReadonlyArray<ScannerMatch<Fact>> => {
    const constructionEscapes = constructionEscapesExternally(context.checker)
    const typeRefEscapes = typeReferenceEscapesExternally(context.checker)

    return ts.isNewExpression(node)
      ? collectionConstructorMatches(constructionEscapes)(node)
      : collectionTypeRefMatches(typeRefEscapes)(node)
  }

const mutableImportMatches =
  <Fact>(mutableModuleName: string) =>
  (mutableName: string) =>
  (makeMutableFact: () => Fact) =>
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
        EffectMatch.value(moduleSpecifier.text),
        EffectMatch.when(isMutableModule, () => Array.of<ts.Node>(moduleSpecifier)),
        EffectMatch.when(isEffectModule, effectNamedImportNodes),
        EffectMatch.orElse(Function.constant(emptyNodes))
      )

    const importNodes = pipe(
      Option.liftPredicate(ts.isStringLiteralLike)(declaration.moduleSpecifier),
      Option.map(nodesForModuleSpecifier),
      Option.getOrElse(Function.constant(emptyNodes))
    )

    const mutableFact = makeMutableFact()
    const makeMutableMatch = (node: ts.Node) => makeNodeMatch(node, mutableFact)

    return Array.map(importNodes, makeMutableMatch)
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
    const emptyMatches: ReadonlyArray<ScannerMatch<Fact>> = Array.empty()

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
    const mutableAccessMatch = makeNodeMatch(access.name, mutableAccessFact)

    return Array.of(mutableAccessMatch)
  }

// makeHashCollectionScanner builds Map/Set scanners because both share the same seams.
export const makeHashCollectionScanner =
  <Fact>(names: HashCollectionNames) =>
  (makeConstructorFact: () => Fact) =>
  (makeTypeRefFact: (typeName: string) => Fact) =>
  (makeMutableFact: () => Fact) => {
    const isCollectionIdentifier = flow(
      Struct.get<ts.Identifier, "text">("text"),
      strictEqual(names.collectionName)
    )

    const isTypeName = (id: ts.Identifier) => Array.contains(names.typeNames, id.text)
    const isRuleNode = isCollectionRuleNode(isTypeName)

    const collectionConstructorMatches =
      constructorMatches<Fact>(isCollectionIdentifier)(makeConstructorFact)

    const collectionTypeRefMatches = typeRefMatches<Fact>(makeTypeRefFact)

    const nodeMatches = collectionNodeMatches<Fact>(collectionConstructorMatches)(
      collectionTypeRefMatches
    )

    const ruleSubscriptions = nodeSubscriptions(ruleNodeKinds)(isRuleNode)(nodeMatches)

    const importMatches = mutableImportMatches<Fact>(names.mutableModuleName)(names.mutableName)(
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

    return new Scanner({ plan: Function.constant(listeners) })
  }

// Prefer scanners keep constant facts local because only their collection names vary.
export const makeHashCollectionPreferScanner =
  <Fact>(names: HashCollectionNames) =>
  (constructorFact: Fact) =>
  (makeTypeRefFact: (typeName: string) => Fact) =>
  (mutableFact: Fact) => {
    const makeConstructorFact = Function.constant(constructorFact)
    const makeMutableFact = Function.constant(mutableFact)

    return makeHashCollectionScanner<Fact>(names)(makeConstructorFact)(makeTypeRefFact)(
      makeMutableFact
    )
  }
