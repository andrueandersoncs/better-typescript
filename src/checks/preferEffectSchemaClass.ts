import { Array, Function, HashMap, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeSubscriptions, withProgramIndex } from "../engine/check.js"
import {
  outermostTransparentWrapper
} from "./support/tsNode.js"
import { foldAst, isProjectSourceFile, type AstFold } from "../engine/sources.js"
import { detection, toRelativeFileName } from "../engine/location.js"
import type { MakeDetection } from "../engine/location.js"
import type { Check, CheckContext, Subscription } from "../engine/check.js"
import type { Detection } from "../engine/location.js"
import type { ProgramContext } from "../engine/sources.js"
import {
  fixtureRefactorExamples
} from "../engine/example.js"
import type { NonEmptyRefactorExamples } from "../engine/example.js"

type ConstructionIndex = HashMap.HashMap<ts.Symbol, string>

const propertyNameText = (name: ts.PropertyName): Option.Option<string> =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(name),
    Option.map(Struct.get("text"))
  )

const namedPropertyText = (
  property: ts.ObjectLiteralElementLike
): Option.Option<string> =>
  pipe(Option.fromNullable(property.name), Option.flatMap(propertyNameText))

const typeHasProperty =
  (type: ts.Type) =>
  (name: string): boolean => {
    const declaredProperty = type.getProperty(name)
    const property = Option.fromNullable(declaredProperty)

    return Option.isSome(property)
  }

const matchesLiteralShape =
  (literal: ts.ObjectLiteralExpression) =>
  (type: ts.Type): boolean =>
    Array.filterMap(literal.properties, namedPropertyText).every(
      typeHasProperty(type)
    )

const candidateTypes =
  (literal: ts.ObjectLiteralExpression) =>
  (contextualType: ts.Type): ReadonlyArray<ts.Type> =>
    contextualType.isUnion()
      ? contextualType.types.filter(matchesLiteralShape(literal))
      : [contextualType]

type ObjectTypeDeclaration = ts.InterfaceDeclaration | ts.TypeAliasDeclaration

const isProjectObjectTypeDeclaration = (
  declaration: ts.Declaration
): boolean => {
  const sourceFile = declaration.getSourceFile()
  const isRelevantDeclaration = [
    ts.isInterfaceDeclaration(declaration),
    ts.isTypeAliasDeclaration(declaration) &&
      ts.isTypeLiteralNode(declaration.type)
  ].some(Boolean)

  return isProjectSourceFile(sourceFile) && isRelevantDeclaration
}

const isProjectObjectTypeSymbol = (symbol: ts.Symbol): boolean =>
  (symbol.declarations ?? []).some(isProjectObjectTypeDeclaration)

const typeObjectTypeSymbol = (type: ts.Type): Option.Option<ts.Symbol> => {
  const symbol = type.getSymbol()
  const directSymbol = pipe(
    Option.fromNullable(symbol),
    Option.filter(isProjectObjectTypeSymbol)
  )
  const aliasSymbol = pipe(
    Option.fromNullable(type.aliasSymbol),
    Option.filter(isProjectObjectTypeSymbol)
  )
  const fallbackAlias = Function.constant(aliasSymbol)

  return Option.orElse(directSymbol, fallbackAlias)
}

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

    return Option.exists(
      reference,
      hasTypeReferenceTarget(declaredMember.target)
    )
  }

const hasTypeReferenceTarget =
  (target: ts.GenericType) =>
  (reference: ts.TypeReference): boolean =>
    reference.target === target

const referenceTypeArgument =
  (checker: ts.TypeChecker) =>
  (typeParameter: ts.Type) =>
  (contextualMembers: ReadonlyArray<ts.Type>) =>
  (declaredMember: ts.TypeReference): ReadonlyArray<ts.Type> => {
    const parameterPosition = checker
      .getTypeArguments(declaredMember)
      .indexOf(typeParameter)

    if (parameterPosition < 0) {
      return []
    }

    const matchingMembers = contextualMembers.filter(
      sameTypeReferenceTarget(declaredMember)
    )

    return Array.filterMap(
      matchingMembers,
      typeArgumentAt(checker)(parameterPosition)
    )
  }

const typeArgumentAt =
  (checker: ts.TypeChecker) =>
  (parameterPosition: number) =>
  (reference: ts.TypeReference): Option.Option<ts.Type> => {
    const typeArguments = checker.getTypeArguments(reference)

    return Option.fromNullable(typeArguments[parameterPosition])
  }

const memberExtractions =
  (checker: ts.TypeChecker) =>
  (typeParameter: ts.Type) =>
  (contextualMembers: ReadonlyArray<ts.Type>) =>
  (declaredMember: ts.Type): ReadonlyArray<ts.Type> => {
    if (declaredMember === typeParameter) {
      return contextualMembers
    }

    return pipe(
      Option.liftPredicate(isTypeReference)(declaredMember),
      Option.map(
        referenceTypeArgument(checker)(typeParameter)(contextualMembers)
      ),
      Option.getOrElse(Function.constant([]))
    )
  }

const signatureBoxedTypes =
  (checker: ts.TypeChecker) =>
  (argumentPosition: number) =>
  (contextual: ts.Type) =>
  (signature: ts.Signature): ReadonlyArray<ts.Type> =>
    pipe(
      Option.fromNullable(signature.parameters[argumentPosition]),
      Option.map(declaredParameterType(checker)),
      Option.filter(isSignatureTypeParameter),
      Option.map(boxedExtraction(checker)(signature)(contextual)),
      Option.getOrElse(Function.constant([]))
    )

const declaredParameterType =
  (checker: ts.TypeChecker) =>
  (parameter: ts.Symbol): ts.Type =>
    checker.getTypeOfSymbol(parameter)

const isSignatureTypeParameter = (type: ts.Type): boolean =>
  type.isTypeParameter()

const boxedExtraction =
  (checker: ts.TypeChecker) =>
  (signature: ts.Signature) =>
  (contextual: ts.Type) =>
  (typeParameter: ts.Type): ReadonlyArray<ts.Type> => {
    const declaredReturn = signature.getReturnType()
    const contextualMembers = typeMembers(contextual)

    return typeMembers(declaredReturn).flatMap(
      memberExtractions(checker)(typeParameter)(contextualMembers)
    )
  }

const isFoundIndex = (index: number): boolean => index >= 0

const addObjectLiteral: AstFold<ReadonlyArray<ts.ObjectLiteralExpression>> = (
  literals,
  node
) =>
  ts.isObjectLiteralExpression(node) ? Array.append(literals, node) : literals

const symbolFileEntry =
  (fileName: string) =>
  (symbol: ts.Symbol): readonly [ts.Symbol, string] => [symbol, fileName]

const literalConstructionEntries =
  (checker: ts.TypeChecker) =>
  (fileName: string) =>
  (
    literal: ts.ObjectLiteralExpression
  ): ReadonlyArray<readonly [ts.Symbol, string]> => {
    const contextualType = checker.getContextualType(literal)
    const directContextualType = Option.fromNullable(contextualType)
    const boxedTypes = pipe(
      Option.gen(function* () {
        const argument = outermostTransparentWrapper(literal)
        const call = yield* Option.liftPredicate(ts.isCallExpression)(
          argument.parent
        )
        const argumentIndex = call.arguments.indexOf(argument)
        const argumentPosition =
          yield* Option.liftPredicate(isFoundIndex)(argumentIndex)
        const callContextualType = checker.getContextualType(call)
        const contextual = yield* Option.fromNullable(callContextualType)
        const signatures = checker
          .getTypeAtLocation(call.expression)
          .getCallSignatures()

        return signatures.flatMap(
          signatureBoxedTypes(checker)(argumentPosition)(contextual)
        )
      }),
      Option.getOrElse(Function.constant([]))
    )
    const targetTypes = pipe(
      Option.toArray(directContextualType),
      Array.appendAll(boxedTypes)
    ).flatMap(candidateTypes(literal))

    return Array.filterMap(targetTypes, typeObjectTypeSymbol).map(
      symbolFileEntry(fileName)
    )
  }

const fileConstructionEntries =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile): ReadonlyArray<readonly [ts.Symbol, string]> => {
    const literals = foldAst(addObjectLiteral)(sourceFile)([])

    return literals.flatMap(
      literalConstructionEntries(checker)(sourceFile.fileName)
    )
  }

const addConstructionEntry = (
  index: ConstructionIndex,
  entry: readonly [ts.Symbol, string]
): ConstructionIndex =>
  HashMap.has(index, entry[0]) ? index : HashMap.set(index, entry[0], entry[1])

const buildConstructionIndex = (context: ProgramContext): ConstructionIndex => {
  const emptyIndex = HashMap.empty<ts.Symbol, string>()

  return context.program
    .getSourceFiles()
    .filter(isProjectSourceFile)
    .flatMap(fileConstructionEntries(context.checker))
    .reduce(addConstructionEntry, emptyIndex)
}

const constructionSymbolFile =
  (index: ConstructionIndex) =>
  (symbol: ts.Symbol): Option.Option<string> =>
    HashMap.get(index, symbol)

type RelativeFileName = (fileName: string) => string

const schemaClassDetection =
  (toRelative: RelativeFileName) =>
  (match: MakeDetection) =>
  (declaration: ObjectTypeDeclaration) =>
  (constructionFileName: string): Detection => {
    const typeName = declaration.name.text
    const exampleFile = toRelative(constructionFileName)
    const kindLabel = ts.isInterfaceDeclaration(declaration)
      ? "an interface"
      : "a type alias"

    return match({
      node: declaration.name,
      message:
        `Avoid declaring ${typeName} as ${kindLabel} when this project constructs ` +
        "its values.",
      hint:
        `Object literals of this shape are built in ${exampleFile}, so ${typeName} is a ` +
        "data definition rather than a boundary type. Replace it with an Effect " +
        `Schema class — class ${typeName} extends ` +
        `Schema.Class<${typeName}>("${typeName}")({ ... }) {} (or Schema.TaggedClass ` +
        "for tagged variants). The class is both the type and the constructor: keep using " +
        `${typeName} in annotations and build values with new ${typeName}({ ... }) ` +
        "so every construction is validated. When the shape must hold non-serializable " +
        "runtime values (streams, functions, ts compiler objects), extend Data.Class " +
        `instead — class ${typeName} extends Data.Class<{ ... }> {} — the same ` +
        "class-as-type-and-constructor discipline without schema validation."
    })
  }

const objectTypeDeclarationMatches =
  (index: ConstructionIndex) => (context: CheckContext) => {
    const checker = context.checker
    const symbolFile = constructionSymbolFile(index)
    const ruleMatch = schemaClassDetection(
      toRelativeFileName(context.projectRoot)
    )(detection(context))

    const matches = (
      declaration: ObjectTypeDeclaration
    ): ReadonlyArray<Detection> => {
      const declarationSymbol = checker.getSymbolAtLocation(declaration.name)

      return pipe(
        Option.fromNullable(declarationSymbol),
        Option.flatMap(symbolFile),
        Option.map(ruleMatch(declaration)),
        Option.toArray
      )
    }

    return matches
  }

const isObjectTypeAliasDeclaration = (
  node: ts.Node
): node is ts.TypeAliasDeclaration =>
  ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)

const schemaClassListeners = (
  index: ConstructionIndex
): ReadonlyArray<Subscription> => {
  const interfaceListeners = nodeSubscriptions([
    ts.SyntaxKind.InterfaceDeclaration
  ])(ts.isInterfaceDeclaration)(objectTypeDeclarationMatches(index))
  const typeAliasListeners = nodeSubscriptions([
    ts.SyntaxKind.TypeAliasDeclaration
  ])(isObjectTypeAliasDeclaration)(objectTypeDeclarationMatches(index))

  return Array.appendAll(interfaceListeners, typeAliasListeners)
}

const check = withProgramIndex(buildConstructionIndex)(schemaClassListeners)

export const preferEffectSchemaClass: Check = check

export const preferEffectSchemaClassExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-schema-class")
