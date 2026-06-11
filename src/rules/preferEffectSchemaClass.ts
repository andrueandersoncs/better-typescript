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
  Option.liftPredicate(ts.isIdentifier)(name).pipe(Option.map(identifierText))

const namedPropertyText = (property: ts.ObjectLiteralElementLike): Option.Option<string> =>
  Option.fromNullable(property.name).pipe(Option.flatMap(propertyNameText))

const literalPropertyNames = (literal: ts.ObjectLiteralExpression): ReadonlyArray<string> =>
  Array.filterMap(literal.properties, namedPropertyText)

const typeHasProperty =
  (type: ts.Type) =>
  (name: string): boolean => {
    const declaredProperty = type.getProperty(name)
    const property = Option.fromNullable(declaredProperty)

    return Option.isSome(property)
  }

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

const isProjectInterfaceDeclaration = (declaration: ts.Declaration): boolean => {
  const sourceFile = declaration.getSourceFile()

  return ts.isInterfaceDeclaration(declaration) && isProjectSourceFile(sourceFile)
}

const isProjectInterfaceSymbol = (symbol: ts.Symbol): boolean =>
  (symbol.declarations ?? []).some(isProjectInterfaceDeclaration)

const typeInterfaceSymbol = (type: ts.Type): Option.Option<ts.Symbol> => {
  const symbol = type.getSymbol()

  return Option.fromNullable(symbol).pipe(Option.filter(isProjectInterfaceSymbol))
}

// getContextualType stops at generic call boundaries: inside Option.some({ ... })
// the argument's declared type is the uninstantiated parameter A, even when the
// call itself is contextually typed Option.Option<DuplicateFunction>. The type
// argument is recovered by lining the declared return type up against the call's
// contextual type, member by member for unions (effect's Option is None<A> | Some<A>).
const isObjectType = (type: ts.Type): type is ts.ObjectType =>
  (type.flags & ts.TypeFlags.Object) !== 0

const hasReferenceObjectFlag = (type: ts.ObjectType): boolean =>
  (type.objectFlags & ts.ObjectFlags.Reference) !== 0

const isTypeReference = (type: ts.Type): type is ts.TypeReference => {
  const objectType = Option.liftPredicate(isObjectType)(type)

  return Option.exists(objectType, hasReferenceObjectFlag)
}

const typeMembers = (type: ts.Type): ReadonlyArray<ts.Type> =>
  type.isUnion() ? type.types : [type]

const sameTypeReferenceTarget =
  (declaredMember: ts.TypeReference) =>
  (contextualMember: ts.Type): contextualMember is ts.TypeReference => {
    const reference = Option.liftPredicate(isTypeReference)(contextualMember)

    return Option.exists(reference, hasTypeReferenceTarget(declaredMember.target))
  }

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

    const matchingMembers = contextualMembers.filter(sameTypeReferenceTarget(declaredMember))

    return Array.filterMap(matchingMembers, typeArgumentAt(checker, parameterPosition))
  }

const typeArgumentAt =
  (checker: ts.TypeChecker, parameterPosition: number) =>
  (reference: ts.TypeReference): Option.Option<ts.Type> => {
    const typeArguments = checker.getTypeArguments(reference)

    return Option.fromNullable(typeArguments[parameterPosition])
  }

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
): ReadonlyArray<ts.Type> => {
  const contextualMembers = typeMembers(contextual)

  return typeMembers(declaredReturn).flatMap(
    memberExtractions(checker, typeParameter, contextualMembers)
  )
}

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
  (typeParameter: ts.Type): ReadonlyArray<ts.Type> => {
    const declaredReturn = signature.getReturnType()

    return extractedTypeArguments(checker, typeParameter, declaredReturn, contextual)
  }

const boxedContextualTypes = (
  checker: ts.TypeChecker,
  literal: ts.ObjectLiteralExpression
): ReadonlyArray<ts.Type> =>
  Option.gen(function* () {
    const argument = outermostTransparentWrapper(literal)
    const call = yield* Option.liftPredicate(ts.isCallExpression)(argument.parent)
    const argumentIndex = call.arguments.indexOf(argument)
    const argumentPosition = yield* Option.liftPredicate(isFoundIndex)(argumentIndex)
    const callContextualType = checker.getContextualType(call)
    const contextual = yield* Option.fromNullable(callContextualType)
    const signatures = checker.getTypeAtLocation(call.expression).getCallSignatures()

    return signatures.flatMap(signatureBoxedTypes(checker, argumentPosition, contextual))
  }).pipe(Option.getOrElse(Function.constant([])))

const isFoundIndex = (index: number): boolean => index >= 0

const literalTargetTypes = (
  checker: ts.TypeChecker,
  literal: ts.ObjectLiteralExpression
): ReadonlyArray<ts.Type> => {
  const contextualType = checker.getContextualType(literal)
  const directContextualType = Option.fromNullable(contextualType)
  const boxedTypes = boxedContextualTypes(checker, literal)

  return [...Option.toArray(directContextualType), ...boxedTypes].flatMap(candidateTypes(literal))
}

const constructedInterfaceSymbols = (
  checker: ts.TypeChecker,
  literal: ts.ObjectLiteralExpression
): ReadonlyArray<ts.Symbol> => {
  const targetTypes = literalTargetTypes(checker, literal)

  return Array.filterMap(targetTypes, typeInterfaceSymbol)
}

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
  const emptyIndex = new Map<ts.Symbol, string>()
  const index = context.program
    .getSourceFiles()
    .filter(isProjectSourceFile)
    .flatMap(fileConstructionEntries(context.checker))
    .reduce(addConstructionEntry, emptyIndex)

  interfaceConstructionCache.set(context.program, index)

  return index
}

const interfaceConstructionIndex = (context: RuleContext): ConstructionIndex => {
  const cachedIndex = interfaceConstructionCache.get(context.program)
  const cached = Option.fromNullable(cachedIndex)

  return Option.isSome(cached) ? cached.value : buildInterfaceConstructionIndex(context)
}

const constructionFile =
  (context: RuleContext) =>
  (symbol: ts.Symbol): Option.Option<string> => {
    const constructionFileName = interfaceConstructionIndex(context).get(symbol)

    return Option.fromNullable(constructionFileName)
  }

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
): ReadonlyArray<RuleMatch> => {
  const interfaceSymbol = context.checker.getSymbolAtLocation(declaration.name)

  return Option.fromNullable(interfaceSymbol).pipe(
    Option.flatMap(constructionFile(context)),
    Option.map(schemaClassRuleMatch(context, declaration)),
    Option.toArray
  )
}

const check = onNode(
  [ts.SyntaxKind.InterfaceDeclaration],
  ts.isInterfaceDeclaration,
  interfaceDeclarationMatches
)

export const preferEffectSchemaClass = new Rule({
  id: ruleId,
  description:
    "Disallow interface declarations for data the project constructs in favor of Effect " +
    "Schema classes.",
  check
})
