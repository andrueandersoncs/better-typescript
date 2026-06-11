import { Array, Function, Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch, toRelativeFileName } from "./ruleMatch.js"
import { astChildren } from "./traverse.js"
import { isProjectSourceFile, transparentWrapperKinds } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-schema-class"

// An interface whose values the project itself constructs is a data definition, not
// a boundary type: the project controls construction, so construction should run
// through a validating Schema class constructor. The index maps each in-project
// interface symbol to one file that builds an object literal of its shape, found by
// asking the checker for the contextual type of every object literal in the program.
type ConstructionIndex = ReadonlyMap<ts.Symbol, string>

const interfaceConstructionCache = new WeakMap<ts.Program, ConstructionIndex>()

const identifierText = (identifier: ts.Identifier): string => identifier.text

const propertyNameText = (name: ts.PropertyName): Option.Option<string> =>
  Option.map(Option.liftPredicate(ts.isIdentifier)(name), identifierText)

const namedPropertyText = (property: ts.ObjectLiteralElementLike): Option.Option<string> =>
  Option.flatMap(Option.fromNullable(property.name), propertyNameText)

const literalPropertyNames = (literal: ts.ObjectLiteralExpression): ReadonlyArray<string> =>
  Array.filterMap(literal.properties, namedPropertyText)

const typeHasProperty =
  (type: ts.Type) =>
  (name: string): boolean =>
    Option.isSome(Option.fromNullable(type.getProperty(name)))

// For a union contextual type (`Nil | Cons`), only members that carry every named
// property of the literal are counted, so constructing one variant does not flag
// its siblings.
const matchesLiteralShape =
  (literal: ts.ObjectLiteralExpression) =>
  (type: ts.Type): boolean =>
    literalPropertyNames(literal).every(typeHasProperty(type))

const candidateTypes =
  (literal: ts.ObjectLiteralExpression) =>
  (contextualType: ts.Type): ReadonlyArray<ts.Type> =>
    contextualType.isUnion()
      ? contextualType.types.filter(matchesLiteralShape(literal))
      : [contextualType]

const isProjectInterfaceDeclaration = (declaration: ts.Declaration): boolean =>
  ts.isInterfaceDeclaration(declaration) && isProjectSourceFile(declaration.getSourceFile())

const isProjectInterfaceSymbol = (symbol: ts.Symbol): boolean =>
  (symbol.declarations ?? []).some(isProjectInterfaceDeclaration)

const typeInterfaceSymbol = (type: ts.Type): Option.Option<ts.Symbol> =>
  Option.filter(Option.fromNullable(type.getSymbol()), isProjectInterfaceSymbol)

// getContextualType stops at generic call boundaries: inside Option.some({ ... })
// the argument's declared type is the uninstantiated parameter A, even when the
// call itself is contextually typed Option.Option<DuplicateFunction>. The type
// argument is recovered by lining the declared return type up against the call's
// contextual type, member by member for unions (effect's Option is None<A> | Some<A>).
const isObjectType = (type: ts.Type): type is ts.ObjectType =>
  (type.flags & ts.TypeFlags.Object) !== 0

const hasReferenceObjectFlag = (type: ts.ObjectType): boolean =>
  (type.objectFlags & ts.ObjectFlags.Reference) !== 0

const isTypeReference = (type: ts.Type): type is ts.TypeReference =>
  Option.exists(Option.liftPredicate(isObjectType)(type), hasReferenceObjectFlag)

const typeMembers = (type: ts.Type): ReadonlyArray<ts.Type> =>
  type.isUnion() ? type.types : [type]

const sameTypeReferenceTarget =
  (declaredMember: ts.TypeReference) =>
  (contextualMember: ts.Type): contextualMember is ts.TypeReference =>
    Option.exists(
      Option.liftPredicate(isTypeReference)(contextualMember),
      hasTypeReferenceTarget(declaredMember.target)
    )

const hasTypeReferenceTarget =
  (target: ts.GenericType) =>
  (reference: ts.TypeReference): boolean =>
    reference.target === target

const referenceTypeArgument =
  (checker: ts.TypeChecker, typeParameter: ts.Type, contextualMembers: ReadonlyArray<ts.Type>) =>
  (declaredMember: ts.TypeReference): ReadonlyArray<ts.Type> => {
    const parameterPosition = checker.getTypeArguments(declaredMember).indexOf(typeParameter)

    if (parameterPosition < 0) {
      return []
    }

    return Array.filterMap(
      contextualMembers.filter(sameTypeReferenceTarget(declaredMember)),
      typeArgumentAt(checker, parameterPosition)
    )
  }

const typeArgumentAt =
  (checker: ts.TypeChecker, parameterPosition: number) =>
  (reference: ts.TypeReference): Option.Option<ts.Type> =>
    Option.fromNullable(checker.getTypeArguments(reference)[parameterPosition])

const memberExtractions =
  (checker: ts.TypeChecker, typeParameter: ts.Type, contextualMembers: ReadonlyArray<ts.Type>) =>
  (declaredMember: ts.Type): ReadonlyArray<ts.Type> => {
    if (declaredMember === typeParameter) {
      return contextualMembers
    }

    return Option.liftPredicate(isTypeReference)(declaredMember).pipe(
      Option.map(referenceTypeArgument(checker, typeParameter, contextualMembers)),
      Option.getOrElse(Function.constant([]))
    )
  }

const extractedTypeArguments = (
  checker: ts.TypeChecker,
  typeParameter: ts.Type,
  declaredReturn: ts.Type,
  contextual: ts.Type
): ReadonlyArray<ts.Type> =>
  typeMembers(declaredReturn).flatMap(
    memberExtractions(checker, typeParameter, typeMembers(contextual))
  )

const isTransparentParent = (parent: ts.Node): parent is ts.Expression =>
  transparentWrapperKinds.has(parent.kind)

const outermostTransparentWrapper = (node: ts.Expression): ts.Expression =>
  isTransparentParent(node.parent) ? outermostTransparentWrapper(node.parent) : node

const signatureBoxedTypes =
  (checker: ts.TypeChecker, argumentPosition: number, contextual: ts.Type) =>
  (signature: ts.Signature): ReadonlyArray<ts.Type> =>
    Option.fromNullable(signature.parameters[argumentPosition]).pipe(
      Option.map(declaredParameterType(checker)),
      Option.filter(isSignatureTypeParameter),
      Option.map(boxedExtraction(checker, signature, contextual)),
      Option.getOrElse(Function.constant([]))
    )

const declaredParameterType =
  (checker: ts.TypeChecker) =>
  (parameter: ts.Symbol): ts.Type =>
    checker.getTypeOfSymbol(parameter)

const isSignatureTypeParameter = (type: ts.Type): boolean => type.isTypeParameter()

const boxedExtraction =
  (checker: ts.TypeChecker, signature: ts.Signature, contextual: ts.Type) =>
  (typeParameter: ts.Type): ReadonlyArray<ts.Type> =>
    extractedTypeArguments(checker, typeParameter, signature.getReturnType(), contextual)

const boxedContextualTypes = (
  checker: ts.TypeChecker,
  literal: ts.ObjectLiteralExpression
): ReadonlyArray<ts.Type> =>
  Option.gen(function* () {
    const argument = outermostTransparentWrapper(literal)
    const call = yield* Option.liftPredicate(ts.isCallExpression)(argument.parent)
    const argumentPosition = yield* Option.liftPredicate(isFoundIndex)(
      call.arguments.indexOf(argument)
    )
    const contextual = yield* Option.fromNullable(checker.getContextualType(call))
    const signatures = checker.getTypeAtLocation(call.expression).getCallSignatures()

    return signatures.flatMap(signatureBoxedTypes(checker, argumentPosition, contextual))
  }).pipe(Option.getOrElse(Function.constant([])))

const isFoundIndex = (index: number): boolean => index >= 0

const literalTargetTypes = (
  checker: ts.TypeChecker,
  literal: ts.ObjectLiteralExpression
): ReadonlyArray<ts.Type> =>
  [
    ...Option.toArray(Option.fromNullable(checker.getContextualType(literal))),
    ...boxedContextualTypes(checker, literal)
  ].flatMap(candidateTypes(literal))

const constructedInterfaceSymbols = (
  checker: ts.TypeChecker,
  literal: ts.ObjectLiteralExpression
): ReadonlyArray<ts.Symbol> =>
  Array.filterMap(literalTargetTypes(checker, literal), typeInterfaceSymbol)

const objectLiteralExpressions = (node: ts.Node): ReadonlyArray<ts.ObjectLiteralExpression> => {
  const childLiterals = astChildren(node).flatMap(objectLiteralExpressions)

  return ts.isObjectLiteralExpression(node) ? [node, ...childLiterals] : childLiterals
}

const symbolFileEntry =
  (fileName: string) =>
  (symbol: ts.Symbol): readonly [ts.Symbol, string] => [symbol, fileName]

const literalConstructionEntries =
  (checker: ts.TypeChecker, fileName: string) =>
  (literal: ts.ObjectLiteralExpression): ReadonlyArray<readonly [ts.Symbol, string]> =>
    constructedInterfaceSymbols(checker, literal).map(symbolFileEntry(fileName))

const fileConstructionEntries =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile): ReadonlyArray<readonly [ts.Symbol, string]> =>
    objectLiteralExpressions(sourceFile).flatMap(
      literalConstructionEntries(checker, sourceFile.fileName)
    )

const addConstructionEntry = (
  index: Map<ts.Symbol, string>,
  entry: readonly [ts.Symbol, string]
): Map<ts.Symbol, string> => (index.has(entry[0]) ? index : index.set(entry[0], entry[1]))

const buildInterfaceConstructionIndex = (context: RuleContext): ConstructionIndex => {
  const index = context.program
    .getSourceFiles()
    .filter(isProjectSourceFile)
    .flatMap(fileConstructionEntries(context.checker))
    .reduce(addConstructionEntry, new Map<ts.Symbol, string>())

  interfaceConstructionCache.set(context.program, index)

  return index
}

const interfaceConstructionIndex = (context: RuleContext): ConstructionIndex => {
  const cached = Option.fromNullable(interfaceConstructionCache.get(context.program))

  return Option.isSome(cached) ? cached.value : buildInterfaceConstructionIndex(context)
}

const constructionFile =
  (context: RuleContext) =>
  (symbol: ts.Symbol): Option.Option<string> =>
    Option.fromNullable(interfaceConstructionIndex(context).get(symbol))

const schemaClassRuleMatch =
  (context: RuleContext, declaration: ts.InterfaceDeclaration) =>
  (constructionFileName: string): RuleMatch => {
    const interfaceName = declaration.name.text
    const exampleFile = toRelativeFileName(context.projectRoot)(constructionFileName)

    return createRuleMatch(context, {
      ruleId,
      node: declaration.name,
      message:
        `Avoid declaring ${interfaceName} as an interface when this project constructs ` +
        "its values.",
      hint:
        `Object literals of this shape are built in ${exampleFile}, so ${interfaceName} is a ` +
        "data definition rather than a boundary type. Replace the interface with an Effect " +
        `Schema class — class ${interfaceName} extends ` +
        `Schema.Class<${interfaceName}>("${interfaceName}")({ ... }) {} (or Schema.TaggedClass ` +
        "for tagged variants). The class is both the type and the constructor: keep using " +
        `${interfaceName} in annotations and build values with new ${interfaceName}({ ... }) ` +
        "so every construction is validated."
    })
  }

const interfaceDeclarationMatches = (
  declaration: ts.InterfaceDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  Option.fromNullable(context.checker.getSymbolAtLocation(declaration.name)).pipe(
    Option.flatMap(constructionFile(context)),
    Option.map(schemaClassRuleMatch(context, declaration)),
    Option.toArray
  )

export const preferEffectSchemaClass = new Rule({
  id: ruleId,
  description:
    "Disallow interface declarations for data the project constructs in favor of Effect " +
    "Schema classes.",
  check: onNode(
    [ts.SyntaxKind.InterfaceDeclaration],
    ts.isInterfaceDeclaration,
    interfaceDeclarationMatches
  )
})
